import { Server } from 'socket.io';
import { Message } from '../models/Message';
import { Status } from '../models/Status';
import { Contact } from '../models/Contact';
import { decrementMediaReference } from './media.utils';

export const startMediaCleanupJob = (io: Server) => {
  const cleanup = async () => {
    try {
      const expirationMs = Number(process.env.MEDIA_EXPIRATION_MS) || 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - expirationMs);

      // 1. Clean up Message Media
      const expiredMessages = await Message.find({
        type: { $in: ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'] },
        createdAt: { $lt: cutoffDate },
        media: { $ne: null },
      });

      for (const msg of expiredMessages) {
        if (msg.media) {
          const mediaRef = msg.media.mediaId || msg.media.publicId;
          if (mediaRef) {
            console.log(`[Media Cleanup] Decrementing message media file: ${mediaRef}`);
            await decrementMediaReference(mediaRef);
          }
        }

        // Unset media from the message record
        msg.media = undefined;
        await msg.save();

        console.log(`[Media Cleanup] Unset media for message ${msg._id}`);
        // Notify chat clients via socket
        io.to(msg.chatId.toString()).emit('message_media_expired', {
          messageId: msg._id,
          chatId: msg.chatId,
        });
      }

      // 2. Clean up Status Media
      const expiredStatuses = await Status.find({
        expiresAt: { $lt: new Date() },
      });

      for (const status of expiredStatuses) {
        if (status.media) {
          const mediaRef = status.media.mediaId || status.media.publicId;
          if (mediaRef) {
            console.log(`[Media Cleanup] Decrementing status media file: ${mediaRef}`);
            await decrementMediaReference(mediaRef);
          }
        }

        // Delete the Status document
        await Status.deleteOne({ _id: status._id });
        console.log(`[Media Cleanup] Deleted status ${status._id}`);

        // Notify followers
        try {
          const followers = await Contact.find({ contactUser: status.user });
          followers.forEach(follower => {
            io.to(follower.user.toString()).emit('status_updated', { userId: status.user });
          });
          io.to(status.user.toString()).emit('status_updated', { userId: status.user });
        } catch (socketErr) {
          console.error('Error broadcasting expired status update:', socketErr);
        }
      }
    } catch (error) {
      console.error('[Media Cleanup Error] Error during media cleanup job:', error);
    }
  };

  // Run cleanup every 1 minute by default
  const intervalMs = Number(process.env.MEDIA_CLEANUP_INTERVAL_MS) || 60 * 1000;
  const interval = setInterval(cleanup, intervalMs);

  // Run once immediately on start
  cleanup();

  return interval;
};
