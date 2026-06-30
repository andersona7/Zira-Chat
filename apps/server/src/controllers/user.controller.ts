import { Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Otp } from '../models/Otp';
import { Session } from '../models/Session';
import { Contact } from '../models/Contact';
import { Status } from '../models/Status';
import { Call } from '../models/Call';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { Block } from '../models/Block';
import { AuthRequest } from '../middleware/auth.middleware';
import { redisClient } from '../config/redis';
import { sendAccountDeletionEmail } from '../utils/email.service';
import { disconnectUserSockets, endActiveCallBetweenUsers } from '../socket';
import cloudinary from '../config/cloudinary';
import Media from '../models/Media';
import { decrementMediaReference } from '../utils/media.utils';

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id)
      .select('-password')
      .populate('blockedUsers', 'username profilePhoto bio isOnline lastSeen');

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Fetch users who blocked the current user
    const blocks = await Block.find({ blockedId: req.user?.id });
    const blockedBy = blocks.map(b => b.blockerId.toString());

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        isOnline: user.isOnline,
        emailVerified: user.emailVerified,
        lastSeen: user.lastSeen,
        settings: user.settings,
        mutedChats: user.mutedChats.map(id => id.toString()),
        blockedUsers: user.blockedUsers,
        blockedBy, // Added blockedBy to response
        // Compatibility fields for existing frontend codebase
        displayName: user.displayName,
        about: user.about,
        avatarUrl: user.avatarUrl,
        status: user.status,
        hasLockPin: !!user.lockPin,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, about, avatarUrl, settings } = req.body;
    const updatePayload: any = {};

    // Map legacy frontend fields to the new DB fields
    if (displayName) updatePayload.fullName = displayName; // if they try to edit name, map to fullName
    if (about !== undefined) updatePayload.bio = about;
    if (avatarUrl !== undefined) updatePayload.profilePhoto = avatarUrl;

    if (settings) {
      if (settings.theme) updatePayload['settings.theme'] = settings.theme;
      if (settings.notifications) {
        if (settings.notifications.sound !== undefined) updatePayload['settings.notifications.sound'] = settings.notifications.sound;
        if (settings.notifications.browser !== undefined) updatePayload['settings.notifications.browser'] = settings.notifications.browser;
      }
      if (settings.privacy) {
        if (settings.privacy.lastSeen) updatePayload['settings.privacy.lastSeen'] = settings.privacy.lastSeen;
        if (settings.privacy.profilePhoto) updatePayload['settings.privacy.profilePhoto'] = settings.privacy.profilePhoto;
        if (settings.privacy.readReceipts !== undefined) updatePayload['settings.privacy.readReceipts'] = settings.privacy.readReceipts;
      }
    }

    const user = await User.findByIdAndUpdate(req.user?.id, { $set: updatePayload }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        isOnline: user.isOnline,
        emailVerified: user.emailVerified,
        lastSeen: user.lastSeen,
        settings: user.settings,
        mutedChats: user.mutedChats.map(id => id.toString()),
        blockedUsers: user.blockedUsers.map(id => id.toString()),
        // Compatibility fields
        displayName: user.displayName,
        about: user.about,
        avatarUrl: user.avatarUrl,
        status: user.status,
        hasLockPin: !!user.lockPin,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const { targetId } = req.params;
    const userId = req.user?.id;

    if (!userId || !targetId) {
      return res.status(400).json({ success: false, error: 'User ID and target ID are required' });
    }

    // 1. Create unique compound index entry in Block collection
    await Block.findOneAndUpdate(
      { blockerId: userId, blockedId: targetId },
      { blockerId: userId, blockedId: targetId },
      { upsert: true, new: true }
    );

    // 2. Add to blocker's User document array
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { blockedUsers: targetId } },
      { new: true }
    );

    // 3. End any active calls between the two users
    endActiveCallBetweenUsers(userId, targetId);

    // 4. Emit real-time socket updates for all devices/tabs of blocker & blocked
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('block:sync', { blockerId: userId, blockedId: targetId, isBlocked: true });
      io.to(targetId).emit('block:user', { blockerId: userId, blockedId: targetId, isBlocked: true });
      io.to(userId).emit('privacy:update');
      io.to(targetId).emit('privacy:update');

      // Check if direct chat exists to synchronize conversation view
      const chat = await Chat.findOne({
        type: 'DIRECT',
        participants: { $all: [userId, targetId] }
      });
      if (chat) {
        io.to(userId).emit('conversation:update', { chatId: chat._id.toString(), isBlocked: true, blockerId: userId });
        io.to(targetId).emit('conversation:update', { chatId: chat._id.toString(), isBlocked: true, blockerId: userId });
      }
    }

    res.status(200).json({ success: true, data: { blockedUsers: user?.blockedUsers } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to block user' });
  }
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const { targetId } = req.params;
    const userId = req.user?.id;

    if (!userId || !targetId) {
      return res.status(400).json({ success: false, error: 'User ID and target ID are required' });
    }

    // 1. Remove from Block collection
    await Block.deleteOne({ blockerId: userId, blockedId: targetId });

    // 2. Pull from blocker's User document array
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { blockedUsers: targetId } },
      { new: true }
    );

    // 3. Emit real-time socket updates for unblocking
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('block:sync', { blockerId: userId, blockedId: targetId, isBlocked: false });
      io.to(targetId).emit('unblock:user', { blockerId: userId, blockedId: targetId, isBlocked: false });
      io.to(userId).emit('privacy:update');
      io.to(targetId).emit('privacy:update');

      // Check if direct chat exists to synchronize conversation view
      const chat = await Chat.findOne({
        type: 'DIRECT',
        participants: { $all: [userId, targetId] }
      });
      if (chat) {
        io.to(userId).emit('conversation:update', { chatId: chat._id.toString(), isBlocked: false, blockerId: userId });
        io.to(targetId).emit('conversation:update', { chatId: chat._id.toString(), isBlocked: false, blockerId: userId });
      }
    }

    res.status(200).json({ success: true, data: { blockedUsers: user?.blockedUsers } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to unblock user' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.status(400).json({ success: false, error: 'Query required' });

    const searchQuery = q.toLowerCase();
    const cacheKey = `search:users:${searchQuery}`;

    // 1. Check Redis Cache
    let cachedResult = null;
    try {
      if (redisClient.isOpen) {
        cachedResult = await redisClient.get(cacheKey);
      }
    } catch (redisError) {
      console.error('⚠️ Redis Cache Read Error:', redisError);
    }

    if (cachedResult) {
      const parsed = JSON.parse(cachedResult);
      const filtered = parsed.filter((u: any) => u.id !== req.user?.id);
      return res.status(200).json({ success: true, data: filtered });
    }

    // 2. Search only by username
    const users = await User.find({
      username: { $regex: searchQuery, $options: 'i' },
    })
      .select('username fullName profilePhoto bio isOnline lastSeen')
      .limit(50);

    const formattedUsers = users.map(u => ({
      id: u._id.toString(),
      username: u.username,
      fullName: u.fullName,
      profilePhoto: u.profilePhoto,
      bio: u.bio,
      isOnline: u.isOnline,
      lastSeen: u.lastSeen,
      // Compatibility fields for the frontend
      displayName: u.displayName,
      about: u.about,
      avatarUrl: u.avatarUrl,
      status: u.status,
    }));

    // 3. Store in Redis
    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(cacheKey, 300, JSON.stringify(formattedUsers));
      }
    } catch (redisError) {
      console.error('⚠️ Redis Cache Write Error:', redisError);
    }

    const responseUsers = formattedUsers.filter(u => u.id !== req.user?.id).slice(0, 20);

    res.status(200).json({ success: true, data: responseUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error searching users' });
  }
};

// Helper for retrying Cloudinary API calls on failure
const retryCloudinary = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 1) throw error;
    console.warn(`⚠️ Cloudinary operation failed. Retrying in ${delay}ms... (Attempts left: ${retries - 1})`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryCloudinary(fn, retries - 1, delay * 2);
  }
};

// Helper to extract Cloudinary public ID from URL if needed
const getPublicIdFromUrl = (url: string): string | null => {
  if (!url || !url.includes('cloudinary.com')) return null;
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;
  const pathParts = parts[1].split('/');
  if (pathParts[0].startsWith('v')) {
    pathParts.shift(); // Remove version segment
  }
  const publicIdWithExt = pathParts.join('/');
  const lastDot = publicIdWithExt.lastIndexOf('.');
  return lastDot === -1 ? publicIdWithExt : publicIdWithExt.substring(0, lastDot);
};

export const requestDeleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    // Check cooldown for deletion requests (e.g. 60 seconds)
    const existingOtp = await Otp.findOne({ email: user.email, type: 'account_deletion' });
    if (existingOtp) {
      const secondsPassed = Math.floor((Date.now() - existingOtp.lastSentAt.getTime()) / 1000);
      if (secondsPassed < 60) {
        return res.status(429).json({
          success: false,
          error: `Please wait ${60 - secondsPassed} seconds before requesting a new deletion link.`,
        });
      }
      await Otp.deleteOne({ _id: existingOtp._id });
    }

    // Generate secure single-use token (expires in 15 minutes)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await Otp.create({
      email: user.email,
      otpHash: tokenHash,
      type: 'account_deletion',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      lastSentAt: new Date(),
    });

    // Send styled email
    await sendAccountDeletionEmail(user.email, token);

    res.status(200).json({
      success: true,
      message: 'A confirmation link has been sent to your registered email address. Please click it to delete your account.',
    });
  } catch (error) {
    console.error('Error in requestDeleteAccount:', error);
    res.status(500).json({ success: false, error: 'Failed to request account deletion' });
  }
};

export const confirmDeleteAccount = async (req: AuthRequest, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const otpDoc = await Otp.findOne({ otpHash: tokenHash, type: 'account_deletion' });

    if (!otpDoc) {
      return res.status(400).json({ success: false, error: 'Invalid or expired deletion token' });
    }

    const user = await User.findOne({ email: otpDoc.email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userIdStr = user._id.toString();

    // 1. CLOUDINARY CLEANUP
    // Gather all media documents owned by this user
    const userMediaDocs = await Media.find({ ownerId: user._id });
    for (const mediaDoc of userMediaDocs) {
      // Force reference count decrement / deletion
      mediaDoc.referenceCount = 1;
      await decrementMediaReference(mediaDoc._id);
    }

    // Gather any legacy media URLs from messages and status to double check deletion
    const userStatuses = await Status.find({ user: user._id });
    const userMessages = await Message.find({ senderId: user._id, type: { $ne: 'TEXT' } });

    const legacyPublicIds: string[] = [];
    if (user.profilePhoto && !user.profilePhoto.match(/^[0-9a-fA-F-]{36}$/)) {
      const pId = getPublicIdFromUrl(user.profilePhoto);
      if (pId) legacyPublicIds.push(pId);
    }
    for (const status of userStatuses) {
      if (status.media) {
        const ref = status.media.mediaId || status.media.publicId;
        if (ref && !ref.match(/^[0-9a-fA-F-]{36}$/)) {
          legacyPublicIds.push(ref);
        }
      }
    }
    for (const msg of userMessages) {
      if (msg.media) {
        const ref = msg.media.mediaId || msg.media.publicId;
        if (ref && !ref.match(/^[0-9a-fA-F-]{36}$/)) {
          legacyPublicIds.push(ref);
        }
      }
    }

    // Decrement reference/destroy legacy publicIds
    for (const pId of legacyPublicIds) {
      await decrementMediaReference(pId);
    }

    // Perform bulk folder and prefix deletion for legacy folders if they exist
    try {
      await retryCloudinary(() => cloudinary.api.delete_resources_by_prefix(`zira_chat/users/${userIdStr}`, { resource_type: 'image' }));
      await retryCloudinary(() => cloudinary.api.delete_resources_by_prefix(`zira_chat/users/${userIdStr}`, { resource_type: 'video' }));
      await retryCloudinary(() => cloudinary.api.delete_resources_by_prefix(`zira_chat/users/${userIdStr}`, { resource_type: 'raw' }));
      await retryCloudinary(() => cloudinary.api.delete_folder(`zira_chat/users/${userIdStr}`));
    } catch (cloudinaryErr) {
      // ignore folder error if already cleared
    }

    // 2. MONGO DATABASE CLEANUP (using session/transaction where supported)
    const runDeletion = async (session: mongoose.ClientSession | null) => {
      const queryOptions = session ? { session } : {};

      // Delete User Profile
      await User.deleteOne({ _id: user._id }, queryOptions);

      // Delete User Contacts
      await Contact.deleteMany({ $or: [{ user: user._id }, { contactUser: user._id }] }, queryOptions);

      // Delete User Statuses
      await Status.deleteMany({ user: user._id }, queryOptions);
      // Remove User from viewers lists on other statuses
      await Status.updateMany({ viewers: user._id }, { $pull: { viewers: user._id } }, queryOptions);

      // Delete Calls
      await Call.deleteMany({ $or: [{ caller: user._id }, { receiver: user._id }] }, queryOptions);

      // Handle Chats & Messages
      const userChats = await Chat.find({ participants: user._id }).session(session);
      for (const chat of userChats) {
        if (chat.type === 'DIRECT') {
          // Delete direct chat and all its messages
          await Chat.deleteOne({ _id: chat._id }, queryOptions);
          await Message.deleteMany({ chatId: chat._id }, queryOptions);
        } else {
          // Group chat: remove participant
          chat.participants = chat.participants.filter(p => p.toString() !== userIdStr);
          if (chat.unreadCounts) {
            chat.unreadCounts.delete(userIdStr);
          }
          if (chat.groupMetadata) {
            chat.groupMetadata.admins = (chat.groupMetadata.admins || []).filter(a => a.toString() !== userIdStr);
          }

          if (chat.participants.length === 0) {
            // Delete group if no members left
            await Chat.deleteOne({ _id: chat._id }, queryOptions);
            await Message.deleteMany({ chatId: chat._id }, queryOptions);
          } else {
            // If the deleted user was the admin, promote the first participant
            if (chat.groupMetadata && (!chat.groupMetadata.admins || chat.groupMetadata.admins.length === 0)) {
              chat.groupMetadata.admins = [chat.participants[0]];
            }
            await chat.save({ session: session || undefined });
          }
        }
      }

      // Delete user messages in group chats
      await Message.deleteMany({ senderId: user._id }, queryOptions);

      // Remove reactions of this user from all messages
      await Message.updateMany({}, { $pull: { reactions: { userId: user._id } } }, queryOptions);

      // Remove stars of this user from all messages
      await Message.updateMany({ starredBy: user._id }, { $pull: { starredBy: user._id } }, queryOptions);

      // Delete Sessions
      await Session.deleteMany({ user: user._id }, queryOptions);

      // Delete Otps
      await Otp.deleteMany({ email: user.email }, queryOptions);
    };

    let transactionSuccess = false;
    let dbSession: mongoose.ClientSession | null = null;
    try {
      dbSession = await mongoose.startSession();
      dbSession.startTransaction();
      await runDeletion(dbSession);
      await dbSession.commitTransaction();
      transactionSuccess = true;
      console.log('✅ Account deletion transaction committed successfully.');
    } catch (txErr: any) {
      console.warn('⚠️ MongoDB Transaction failed or not supported. Falling back to non-transactional deletion. Detail:', txErr.message);
      if (dbSession) {
        try {
          await dbSession.abortTransaction();
        } catch (abortErr) {
          // Ignore error during abort
        }
      }
    } finally {
      if (dbSession) {
        dbSession.endSession();
      }
    }

    // Run fallback if transaction did not execute
    if (!transactionSuccess) {
      console.log('🔄 Executing account deletion database operations sequentially...');
      await runDeletion(null);
    }

    // 3. SOCKET DISCONNECT
    await disconnectUserSockets(userIdStr);

    res.status(200).json({ success: true, message: 'Account and all related data deleted successfully.' });
  } catch (error) {
    console.error('Error in confirmDeleteAccount:', error);
    res.status(500).json({ success: false, error: 'Server error executing account deletion' });
  }
};