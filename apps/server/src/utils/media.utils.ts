import crypto from 'crypto';
import path from 'path';
import cloudinary from '../config/cloudinary';

// Generate secure identifier (UUIDv4)
export const generateMediaId = (): string => {
  return crypto.randomUUID();
};

// Calculate SHA-256 checksum of buffer
export const calculateChecksum = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Sanitize filename to prevent directory traversal and clean special characters
export const sanitizeFilename = (filename: string): string => {
  const parsed = path.parse(filename);
  const safeBase = parsed.name
    .replace(/[^a-zA-Z0-9_-]/g, '_') // only allow alphanumeric, dash, underscore
    .substring(0, 100); // truncate length
  const safeExt = parsed.ext.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
};

// Encrypt filename using a basic deterministic cipher or simple AES-256-CBC
// For simplicity, we can use a key derived from a secret or standard AES-256-GCM / CBC.
// If no key is set, we fallback to a simple hash/obfuscated representation.
const ENCRYPTION_KEY = process.env.MEDIA_ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

export const encryptFilename = (filename: string): string => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = typeof ENCRYPTION_KEY === 'string' ? crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32) : ENCRYPTION_KEY;
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(filename, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    // Fallback obfuscation if encryption fails
    return crypto.createHash('md5').update(filename).digest('hex');
  }
};

export const decryptFilename = (encryptedText: string): string => {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return 'unknown_file';
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = typeof ENCRYPTION_KEY === 'string' ? crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32) : ENCRYPTION_KEY;
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return 'unknown_file';
  }
};

// Magic bytes checks for common media types
export const validateMagicBytes = (buffer: Buffer, mimeType: string): boolean => {
  if (!buffer || buffer.length < 4) return false;

  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  
  // Map common MIME types to magic byte prefixes
  if (mimeType.startsWith('image/jpeg')) {
    return hex.startsWith('FFD8FF');
  }
  if (mimeType.startsWith('image/png')) {
    return hex === '89504E47';
  }
  if (mimeType.startsWith('image/gif')) {
    return hex.startsWith('47494638');
  }
  if (mimeType.startsWith('application/pdf')) {
    return hex === '25504446'; // %PDF
  }
  if (mimeType.startsWith('video/mp4')) {
    // MP4 signature is usually at offset 4 (e.g. ftyp)
    if (buffer.length >= 12) {
      const brand = buffer.toString('utf8', 4, 12);
      return brand.includes('ftyp');
    }
  }
  if (mimeType.startsWith('audio/mpeg') || mimeType.startsWith('audio/mp3')) {
    // MP3 can start with ID3 (494433) or sync frame (FFF)
    return hex.startsWith('494433') || hex.startsWith('FFF');
  }

  // Fallback pass for unspecified/raw documents
  return true;
};

// Hook for future anti-virus scans (e.g. ClamAV)
export const runVirusScan = async (buffer: Buffer): Promise<void> => {
  // Placeholder virus scan hook
  // In production, integration with clamd or an external API would go here
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty file buffer provided for virus scanning');
  }
  // Assume safe for now
  return;
};

// Cloudinary URL Signer
export const generateSignedCloudinaryUrl = (publicId: string, mimeType: string): string => {
  // Determine resource type for Cloudinary
  let resourceType: 'image' | 'video' | 'raw' = 'raw';
  if (mimeType.startsWith('image/')) {
    resourceType = 'image';
  } else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    resourceType = 'video';
  }

  // Use 'upload' type for legacy assets, 'authenticated' for new zero-trust assets
  const isLegacy = !publicId.startsWith('zira/media/');
  const deliveryType = isLegacy ? 'upload' : 'authenticated';

  const expiresAt = Math.floor(Date.now() / 1000) + 60; // expires in 60 seconds

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    sign_url: true,
    expires_at: expiresAt,
    secure: true,
  });
};

// Safe Media Reference Decrement & Deletion
export const decrementMediaReference = async (mediaIdOrPublicId: string) => {
  if (!mediaIdOrPublicId) return;

  try {
    // Import Media model dynamically to avoid circular dependencies if any
    const Media = (await import('../models/Media')).default;

    // Find by mediaId (UUID) first
    let media = await Media.findById(mediaIdOrPublicId);
    if (!media) {
      // If not found, try by cloudinaryPublicId
      media = await Media.findOne({ cloudinaryPublicId: mediaIdOrPublicId });
    }

    if (media) {
      media.referenceCount -= 1;
      if (media.referenceCount <= 0) {
        let resourceType: 'image' | 'video' | 'raw' = 'raw';
        if (media.mimeType.startsWith('image/')) resourceType = 'image';
        else if (media.mimeType.startsWith('video/') || media.mimeType.startsWith('audio/')) resourceType = 'video';

        const isLegacy = !media.cloudinaryPublicId.startsWith('zira/media/');
        const deliveryType = isLegacy ? 'upload' : 'authenticated';

        try {
          const result = await cloudinary.uploader.destroy(media.cloudinaryPublicId, {
            resource_type: resourceType,
            type: deliveryType,
          });
          console.log(`[Media Cleanup] Cloudinary destroy result for ${media.cloudinaryPublicId}:`, result);
        } catch (err) {
          console.error(`[Media Cleanup] Failed to destroy Cloudinary asset:`, err);
        }

        media.deletedAt = new Date();
        await media.save();
      } else {
        await media.save();
      }
    } else {
      // Legacy direct Cloudinary publicId cleanup
      if (mediaIdOrPublicId.includes('zira_chat/')) {
        try {
          await cloudinary.uploader.destroy(mediaIdOrPublicId, { resource_type: 'image' });
          await cloudinary.uploader.destroy(mediaIdOrPublicId, { resource_type: 'video' });
          await cloudinary.uploader.destroy(mediaIdOrPublicId, { resource_type: 'raw' });
        } catch (err) {
          console.error(`[Media Cleanup] Legacy direct destroy failed for ${mediaIdOrPublicId}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`[Media Cleanup Error] Error in decrementMediaReference:`, err);
  }
};
