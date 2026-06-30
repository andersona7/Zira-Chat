import { Session } from '../models/Session';
import { SecurityLog } from '../models/SecurityLog';

export const startSessionCleanupJob = () => {
  // Run cleanup check every 1 hour
  setInterval(async () => {
    try {
      const now = new Date();

      // 1. Terminate expired sessions
      const expiredResult = await Session.updateMany(
        { expiresAt: { $lt: now }, status: 'ACTIVE' },
        { $set: { status: 'EXPIRED', logoutReason: 'Session lifetime limit reached' } }
      );

      // 2. Terminate idle sessions (7 days of no activity)
      const idleLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const idleResult = await Session.updateMany(
        { lastActivity: { $lt: idleLimit }, status: 'ACTIVE' },
        { $set: { status: 'EXPIRED', logoutReason: 'Idle timeout reached' } }
      );

      if (expiredResult.modifiedCount > 0 || idleResult.modifiedCount > 0) {
        console.log(
          `🧹 Background Cleanup: Revoked ${expiredResult.modifiedCount} expired and ${idleResult.modifiedCount} idle sessions.`
        );
      }
    } catch (error) {
      console.error('❌ Session cleanup background job failed:', error);
    }
  }, 60 * 60 * 1000).unref();
};
