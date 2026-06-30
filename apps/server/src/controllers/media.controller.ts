import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import cloudinary from '../config/cloudinary';
import streamifier from 'streamifier';
import Media from '../models/Media';
import { User } from '../models/User';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { Status } from '../models/Status';
import { Contact } from '../models/Contact';
import {
  generateMediaId,
  calculateChecksum,
  sanitizeFilename,
  encryptFilename,
  validateMagicBytes,
  runVirusScan,
  generateSignedCloudinaryUrl,
} from '../utils/media.utils';

// Helper to determine media type from MIME
const getMediaTypeFromMime = (mimeType: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' => {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
};

// Upload Media
export const uploadMedia = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const { originalname, mimetype, size, buffer } = req.file;

    // 1. MIME Validation & Magic Bytes Validation
    if (!validateMagicBytes(buffer, mimetype)) {
      return res.status(400).json({ success: false, error: 'File validation failed: magic bytes do not match MIME type.' });
    }

    // 2. Virus Scan Hook
    try {
      await runVirusScan(buffer);
    } catch (scanErr: any) {
      return res.status(400).json({ success: false, error: `Security Scan Failed: ${scanErr.message}` });
    }

    // 3. Filename Sanitization & Encryption
    const cleanName = sanitizeFilename(originalname);
    const encName = encryptFilename(cleanName);

    // 4. Checksum Duplication Check (Reference Counting)
    const checksum = calculateChecksum(buffer);
    const existingMedia = await Media.findOne({ checksum, ownerId: req.user?.id, deletedAt: null });

    if (existingMedia) {
      existingMedia.referenceCount += 1;
      await existingMedia.save();

      return res.status(200).json({
        success: true,
        data: {
          mediaId: existingMedia._id,
          url: existingMedia._id, // Used by profile photo uploader to set profilePhoto = mediaId
          publicId: '', // Expose nothing
          mimeType: existingMedia.mimeType,
          size: existingMedia.size,
          name: cleanName,
        },
      });
    }

    // 5. Cloudinary Upload as Authenticated Asset
    const mediaId = generateMediaId();
    const year = new Date().getFullYear();
    const cloudinaryPublicId = `zira/media/${year}/${mediaId}`;

    let resourceType: 'image' | 'video' | 'raw' = 'raw';
    if (mimetype.startsWith('image/')) resourceType = 'image';
    else if (mimetype.startsWith('video/') || mimetype.startsWith('audio/')) resourceType = 'video';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: cloudinaryPublicId,
        resource_type: resourceType,
        type: 'authenticated',
      },
      async (error, result) => {
        if (error || !result) {
          console.error('Cloudinary Secure Upload Error:', error);
          if (!res.headersSent) {
            return res.status(500).json({ success: false, error: 'Failed to upload secure media to cloud' });
          }
          return;
        }

        try {
          // Save to database
          const mediaDoc = await Media.create({
            _id: mediaId,
            cloudinaryPublicId,
            ownerId: req.user?.id,
            mediaType: getMediaTypeFromMime(mimetype),
            mimeType: mimetype,
            size,
            checksum,
            encryptedFilename: encName,
            referenceCount: 1,
          });

          if (!res.headersSent) {
            res.status(200).json({
              success: true,
              data: {
                mediaId: mediaDoc._id,
                url: mediaDoc._id, // Map mediaId to url field so frontend is backwards compatible
                publicId: '', // Securely hidden
                mimeType: mimetype,
                size,
                name: cleanName,
              },
            });
          }
        } catch (dbErr) {
          console.error('Database Save Error for Media:', dbErr);
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Failed to save media metadata' });
          }
        }
      }
    );

    uploadStream.on('error', (err) => {
      console.error('Cloudinary Stream Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to stream media to cloud' });
      }
    });

    const readStream = streamifier.createReadStream(buffer);
    readStream.pipe(uploadStream);

  } catch (error) {
    console.error('Internal upload error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during upload' });
  }
};

// Retrieve Secure Media URL
export const getMedia = async (req: AuthRequest, res: Response) => {
  try {
    const { mediaId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 1. Fetch Media Metadata
    const media = await Media.findById(mediaId);
    if (!media || media.deletedAt) {
      // Check if it is a legacy publicId mapping instead
      // If mediaId is not a UUID but has zira_chat/users/ or similar, handle legacy public ID
      if (mediaId.includes('zira_chat/')) {
        const signedUrl = generateSignedCloudinaryUrl(mediaId, 'image/png');
        return res.status(200).json({ success: true, url: signedUrl });
      }
      return res.status(404).json({ success: false, error: 'Media not found' });
    }

    // 2. Authorization Layer
    // Check if the user is the owner
    const isOwner = media.ownerId.toString() === userId;
    let isAuthorized = isOwner;

    if (!isAuthorized) {
      // Find if any message references this media and the user is in the chat of that message
      const messages = await Message.find({
        $or: [
          { 'media.mediaId': mediaId },
          { 'media.url': mediaId }
        ]
      });
      for (const message of messages) {
        const chat = await Chat.findById(message.chatId);
        if (chat && chat.participants.some(p => p.toString() === userId)) {
          isAuthorized = true;
          // Link chatId if not already linked (for tracking/caching purposes)
          if (!media.chatId) {
            media.chatId = message.chatId;
            media.messageId = message._id as any;
            await media.save();
          }
          break;
        }
      }
    }

    if (!isAuthorized) {
      // Check if it's a profile photo (avatar) or status update
      // Profile Photos: verify blocker status
      const owner = await User.findById(media.ownerId);
      if (owner) {
        const isBlocked = owner.blockedUsers.some(id => id.toString() === userId);
        const hasBlockedMe = await User.findOne({ _id: userId, blockedUsers: owner._id });
        if (!isBlocked && !hasBlockedMe) {
          // Allow profile photo if we can verify this media is indeed the user's active avatar
          if (owner.profilePhoto === mediaId) {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      // Check if it's active status media
      const status = await Status.findOne({ 'media.mediaId': mediaId });
      if (status) {
        const isContact = await Contact.findOne({ user: status.user, contactUser: userId });
        if (isContact || status.user.toString() === userId) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to access this media.' });
    }

    // 3. Generate Signed URL (expires in 30 seconds)
    const signedUrl = generateSignedCloudinaryUrl(media.cloudinaryPublicId, media.mimeType);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return res.status(200).json({ success: true, url: signedUrl });

  } catch (error) {
    console.error('Error fetching secure URL:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Download Media Route
export const downloadMedia = async (req: AuthRequest, res: Response) => {
  try {
    const { mediaId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const media = await Media.findById(mediaId);
    if (!media || media.deletedAt) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }

    // Permission check
    const isOwner = media.ownerId.toString() === userId;
    let isAuthorized = isOwner;

    if (!isAuthorized) {
      const messages = await Message.find({
        $or: [
          { 'media.mediaId': mediaId },
          { 'media.url': mediaId }
        ]
      });
      for (const message of messages) {
        const chat = await Chat.findById(message.chatId);
        if (chat && chat.participants.some(p => p.toString() === userId)) {
          isAuthorized = true;
          break;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Generate signed URL with attachment configuration
    let resourceType: 'image' | 'video' | 'raw' = 'raw';
    if (media.mimeType.startsWith('image/')) resourceType = 'image';
    else if (media.mimeType.startsWith('video/') || media.mimeType.startsWith('audio/')) resourceType = 'video';

    const expiresAt = Math.floor(Date.now() / 1000) + 60; // 60 seconds
    const signedUrl = cloudinary.url(media.cloudinaryPublicId, {
      resource_type: resourceType,
      type: 'authenticated',
      sign_url: true,
      expires_at: expiresAt,
      flags: 'attachment',
      secure: true,
    });

    return res.status(200).json({ success: true, url: signedUrl });
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};