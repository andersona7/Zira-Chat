import { Response } from 'express';
import { Contact } from '../models/Contact';
import { User } from '../models/User';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { Call } from '../models/Call';
import { Status } from '../models/Status';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import { decrementMediaReference } from '../utils/media.utils';

export const getContacts = async (req: AuthRequest, res: Response) => {
  try {
    const contacts = await Contact.find({ user: req.user?.id })
      .populate({
        path: 'contactUser',
        select: 'username fullName profilePhoto bio isOnline lastSeen email',
      })
      .sort({ createdAt: -1 });

    const userSelf = await User.findById(req.user?.id);
    const blockedList = userSelf?.blockedUsers?.map(id => id.toString()) || [];

    const formattedContacts = contacts
      .filter((c: any) => c.contactUser && !blockedList.includes(c.contactUser._id.toString()))
      .map((c: any) => ({
        id: c._id,
        customName: c.customName,
        isBlocked: c.isBlocked,
        isFavourite: c.isFavourite,
        isMuted: c.isMuted,
        isLocked: c.isLocked,
        lockPin: c.lockPin,
        createdAt: c.createdAt,
        contactUser: {
          id: c.contactUser._id,
          username: c.contactUser.username,
          fullName: c.contactUser.fullName,
          profilePhoto: c.contactUser.profilePhoto,
          bio: c.contactUser.bio,
          isOnline: c.contactUser.isOnline,
          lastSeen: c.contactUser.lastSeen,
          email: c.contactUser.email,
          // Compatibility fields
          displayName: c.contactUser.displayName,
          about: c.contactUser.about,
          avatarUrl: c.contactUser.avatarUrl,
          status: c.contactUser.status,
        },
      }));

    res.status(200).json({ success: true, data: formattedContacts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve contacts' });
  }
};

export const addContact = async (req: AuthRequest, res: Response) => {
  try {
    const { username, customName } = req.body;

    const targetUser = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User with this username not found' });
    }

    if (targetUser._id.toString() === req.user?.id) {
      return res.status(400).json({ success: false, error: 'You cannot add yourself as a contact' });
    }

    const existingContact = await Contact.findOne({ user: req.user?.id, contactUser: targetUser._id });
    if (existingContact) {
      return res.status(409).json({ success: false, error: 'User is already in your contacts' });
    }

    const savedCustomName = customName && customName.trim() !== '' ? customName.trim() : undefined;

    const newContact = await Contact.create({
      user: req.user?.id,
      contactUser: targetUser._id,
      customName: savedCustomName,
    });

    const populatedContact = await newContact.populate({
      path: 'contactUser',
      select: 'username fullName profilePhoto bio isOnline lastSeen email',
    });

    const responseContact = {
      id: populatedContact._id,
      customName: populatedContact.customName,
      isBlocked: populatedContact.isBlocked,
      isFavourite: populatedContact.isFavourite,
      isMuted: populatedContact.isMuted,
      isLocked: populatedContact.isLocked,
      lockPin: populatedContact.lockPin,
      createdAt: populatedContact.createdAt,
      contactUser: {
        id: (populatedContact.contactUser as any)._id,
        username: (populatedContact.contactUser as any).username,
        fullName: (populatedContact.contactUser as any).fullName,
        profilePhoto: (populatedContact.contactUser as any).profilePhoto,
        bio: (populatedContact.contactUser as any).bio,
        isOnline: (populatedContact.contactUser as any).isOnline,
        lastSeen: (populatedContact.contactUser as any).lastSeen,
        email: (populatedContact.contactUser as any).email,
        // Compatibility fields
        displayName: (populatedContact.contactUser as any).displayName,
        about: (populatedContact.contactUser as any).about,
        avatarUrl: (populatedContact.contactUser as any).avatarUrl,
        status: (populatedContact.contactUser as any).status,
      },
    };

    res.status(201).json({ success: true, data: responseContact });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add contact' });
  }
};

export const updateContact = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { customName, isBlocked, isFavourite, isMuted, isLocked, lockPin } = req.body;

    const contact = await Contact.findOne({ _id: id, user: req.user?.id });
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    if (customName !== undefined) {
      if (customName === null || customName.trim() === '') {
        contact.customName = undefined;
      } else {
        contact.customName = customName.trim();
      }
    }
    if (isBlocked !== undefined) {
      contact.isBlocked = isBlocked;
      // Mirror block to user's blocked list
      if (isBlocked) {
        await User.findByIdAndUpdate(req.user?.id, { $addToSet: { blockedUsers: contact.contactUser } });
      } else {
        await User.findByIdAndUpdate(req.user?.id, { $pull: { blockedUsers: contact.contactUser } });
      }
    }
    if (isFavourite !== undefined) contact.isFavourite = isFavourite;
    if (isMuted !== undefined) contact.isMuted = isMuted;
    if (isLocked !== undefined) contact.isLocked = isLocked;
    if (lockPin !== undefined) {
      if (lockPin === '') {
        contact.lockPin = undefined;
      } else {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        contact.lockPin = await bcrypt.hash(lockPin, salt);
      }
    }

    await contact.save();

    const populated = await contact.populate({
      path: 'contactUser',
      select: 'username fullName profilePhoto bio isOnline lastSeen email',
    });

    const responseContact = {
      id: populated._id,
      customName: populated.customName,
      isBlocked: populated.isBlocked,
      isFavourite: populated.isFavourite,
      isMuted: populated.isMuted,
      isLocked: populated.isLocked,
      lockPin: populated.lockPin,
      createdAt: populated.createdAt,
      contactUser: {
        id: (populated.contactUser as any)._id,
        username: (populated.contactUser as any).username,
        fullName: (populated.contactUser as any).fullName,
        profilePhoto: (populated.contactUser as any).profilePhoto,
        bio: (populated.contactUser as any).bio,
        isOnline: (populated.contactUser as any).isOnline,
        lastSeen: (populated.contactUser as any).lastSeen,
        email: (populated.contactUser as any).email,
        displayName: (populated.contactUser as any).displayName,
        about: (populated.contactUser as any).about,
        avatarUrl: (populated.contactUser as any).avatarUrl,
        status: (populated.contactUser as any).status,
      },
    };

    const io = req.app.get('io');
    if (io) {
      io.to(req.user?.id as string).emit('contact_updated', responseContact);
    }

    res.status(200).json({ success: true, data: responseContact });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update contact' });
  }
};

export const deleteContact = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const contact = await Contact.findOne({ _id: req.params.id, user: userId });
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const contactUserId = contact.contactUser;

    // Delete the contact document
    await Contact.findByIdAndDelete(req.params.id);

    // Find direct chat between the two users
    const chat = await Chat.findOne({
      type: 'DIRECT',
      participants: { $all: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(contactUserId)] },
    });

    let deletedChatId: string | undefined;

    if (chat) {
      deletedChatId = chat._id.toString();
      
      // 1. Mark chat as deletedFor this user
      if (!chat.deletedFor.map(id => id.toString()).includes(userId)) {
        chat.deletedFor.push(new mongoose.Types.ObjectId(userId));
        await chat.save();
      }

      // 2. Mark all messages in this chat as deletedFor this user
      const messages = await Message.find({
        chatId: chat._id,
        deletedFor: { $ne: new mongoose.Types.ObjectId(userId) },
      });

      const messageIdsToUpdate: mongoose.Types.ObjectId[] = [];
      const mediaToCheck: { ref: string; publicId: string; mimeType: string }[] = [];

      for (const msg of messages) {
        messageIdsToUpdate.push(msg._id as mongoose.Types.ObjectId);
        if (msg.media) {
          const ref = msg.media.mediaId || msg.media.publicId;
          if (ref) {
            mediaToCheck.push({ ref, publicId: msg.media.publicId, mimeType: msg.media.mimeType });
          }
        }
      }

      if (messageIdsToUpdate.length > 0) {
        await Message.updateMany(
          { _id: { $in: messageIdsToUpdate } },
          { $addToSet: { deletedFor: new mongoose.Types.ObjectId(userId) } }
        );
      }

      // 3. For any message containing media, if all participants in the chat or all users in the system have deleted it or it is no longer referenced, clean it up
      for (const item of mediaToCheck) {
        const referencingMessages = await Message.find({
          $or: [
            { 'media.publicId': item.publicId },
            { 'media.mediaId': item.ref }
          ]
        }).populate('chatId');

        let isReferenced = false;
        for (const refMsg of referencingMessages) {
          const refChat = refMsg.chatId as any;
          if (refChat && refChat.participants) {
            const nonDeletedParticipants = refChat.participants.filter(
              (pId: any) => !refMsg.deletedFor.map((dId: any) => dId.toString()).includes(pId.toString())
            );
            if (nonDeletedParticipants.length > 0) {
              isReferenced = true;
              break;
            }
          }
        }

        if (!isReferenced) {
          const statusReference = await Status.findOne({
            $or: [
              { 'media.publicId': item.publicId },
              { 'media.mediaId': item.ref }
            ]
          });
          if (!statusReference) {
            console.log(`[Media Cleanup] Deleting unreferenced asset: ${item.ref}`);
            await decrementMediaReference(item.ref);
          }
        }
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('contact_deleted', { id: req.params.id, contactUserId, chatId: deletedChatId });
      if (deletedChatId) {
        io.to(userId).emit('chat_updated', { chatId: deletedChatId, deleted: true });
      }
    }

    res.status(200).json({ success: true, data: { id: req.params.id, contactUserId, chatId: deletedChatId } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete contact' });
  }
};

export const sendLockResetOtp = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const email = user.email.toLowerCase();

    // Check 60-second cooldown
    const { Otp } = require('../models/Otp');
    const existingOtp = await Otp.findOne({ email, type: 'lock_reset' });
    if (existingOtp) {
      const secondsPassed = Math.floor((Date.now() - existingOtp.lastSentAt.getTime()) / 1000);
      if (secondsPassed < 60) {
        return res.status(429).json({
          success: false,
          error: `Please wait ${60 - secondsPassed} seconds before requesting a new OTP.`,
        });
      }
    }

    const otpVal = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otpVal, salt);

    await Otp.deleteMany({ email, type: 'lock_reset' });
    await Otp.create({
      email,
      otpHash,
      type: 'lock_reset',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
      lastSentAt: new Date(),
    });

    // Send email with nodemailer transporter
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Reset Chat Lock PIN - Zira Chat',
      text: `Your Chat Lock PIN reset code is:\n${otpVal}\n\nThis code expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #6366f1; text-align: center;">Reset Your Chat Lock PIN</h2>
          <p>Your PIN reset code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 30px 0; color: #1e1b4b; background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
            ${otpVal}
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'OTP sent to registered email address' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
};

export const verifyLockResetOtp = async (req: AuthRequest, res: Response) => {
  try {
    const { otp } = req.body;
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const email = user.email.toLowerCase();
    const { Otp } = require('../models/Otp');
    const dbOtp = await Otp.findOne({ email, type: 'lock_reset' });

    if (!dbOtp || dbOtp.expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'OTP has expired or is invalid' });
    }

    if (dbOtp.attempts >= 5) {
      return res.status(400).json({ success: false, error: 'Too many failed verification attempts' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(otp, dbOtp.otpHash);

    if (!isMatch) {
      dbOtp.attempts += 1;
      await dbOtp.save();
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    dbOtp.verified = true;
    await dbOtp.save();

    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};

export const verifyPasswordForLockReset = async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Incorrect account password' });
    }

    res.status(200).json({ success: true, message: 'Password verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to verify password' });
  }
};

export const resetLockPin = async (req: AuthRequest, res: Response) => {
  try {
    const { newPin } = req.body;
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify OTP was validated
    const email = user.email.toLowerCase();
    const { Otp } = require('../models/Otp');
    const dbOtp = await Otp.findOne({ email, type: 'lock_reset', verified: true });
    if (!dbOtp) {
      return res.status(403).json({ success: false, error: 'Identity verification required before resetting PIN' });
    }

    // PIN Validation: 6 to 12 digits, no sequential (e.g. 123456) or identical (111111) digits
    if (!/^\d{6,12}$/.test(newPin)) {
      return res.status(400).json({ success: false, error: 'PIN must be between 6 and 12 digits' });
    }

    const sameDigits = newPin[0].repeat(newPin.length) === newPin;
    if (sameDigits) {
      return res.status(400).json({ success: false, error: 'PIN digits cannot all be identical' });
    }

    const sequentialInc = '0123456789012';
    const sequentialDec = '9876543210987';
    if (sequentialInc.includes(newPin) || sequentialDec.includes(newPin)) {
      return res.status(400).json({ success: false, error: 'PIN digits cannot be sequential' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(newPin, salt);

    // Update all locked contacts for this user
    await Contact.updateMany(
      { user: userId, isLocked: true },
      { $set: { lockPin: pinHash } }
    );

    // Invalidate OTP
    await Otp.deleteMany({ email, type: 'lock_reset' });

    // Send email notification of change
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    const mailOptions = {
      from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Security Alert: Chat Lock PIN Updated - Zira Chat',
      text: 'This email is to notify you that your Zira Chat Chat Lock PIN was successfully updated. If you did not make this change, please contact support immediately.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #ef4444; text-align: center;">Chat Lock PIN Changed</h2>
          <p>This is to confirm that the Chat Lock PIN for your Zira Chat account was updated.</p>
          <p style="color: #6b7280; font-size: 14px;">If you did not request this update, please change your password and secure your account immediately.</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);

    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('lock_pin_reset');
    }

    res.status(200).json({ success: true, message: 'Chat Lock PIN successfully reset across all contacts' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reset PIN' });
  }
};