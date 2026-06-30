import { Request } from 'express';
import mongoose from 'mongoose';
import { Session, ISession, SessionStatus } from '../models/Session';
import { hashToken, generateSecureToken, generateSessionId } from '../utils/crypto.utils';
import { parseUserAgent } from '../utils/device.utils';
import { getGeoFromIP } from '../utils/geo.utils';
import { SECURITY_CONFIG } from '../config/security.constants';
import { logSecurityEvent } from './security-log.service';
import { sendNewDeviceAlert, sendTokenTheftAlert } from './security-email.service';
import { User } from '../models/User';
import { disconnectUserSockets } from '../socket';

export const createSession = async (
  userId: string | mongoose.Types.ObjectId,
  req: Request,
  riskScore: number = 0,
  deviceId?: string
): Promise<{ session: ISession; rawRefreshToken: string }> => {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const uaString = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
  
  const deviceInfo = parseUserAgent(uaString);
  const geoInfo = getGeoFromIP(ip);
  const finalDeviceId = deviceId || req.body.deviceId || req.headers['x-device-id'] as string || generateSecureToken();
  const rawRefreshToken = generateSecureToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  const sessionId = generateSessionId();

  // Enforce session limit per user by revoking the oldest session(s) if we exceed the limit
  const activeSessions = await Session.find({ user: userObjId, status: 'ACTIVE' }).sort({ lastActivity: 1 });
  if (activeSessions.length >= SECURITY_CONFIG.MAX_SESSIONS_PER_USER) {
    const excessCount = activeSessions.length - SECURITY_CONFIG.MAX_SESSIONS_PER_USER + 1;
    const sessionsToRevoke = activeSessions.slice(0, excessCount);
    for (const oldSess of sessionsToRevoke) {
      oldSess.status = 'REVOKED';
      oldSess.logoutReason = 'Session limit exceeded';
      await oldSess.save();
      // Disconnect socket for this session
      const io = req.app.get('io');
      if (io) {
        const sockets = await io.fetchSockets();
        for (const s of sockets) {
          if (s.data.sessionId === oldSess.sessionId) {
            s.emit('session:revoked', { reason: 'Session limit exceeded' });
            s.disconnect(true);
          }
        }
      }
    }
  }

  // Check if this is a new device for the user to trigger security email alerts
  const deviceExists = await Session.findOne({ user: userObjId, deviceId: finalDeviceId });

  const session = await Session.create({
    sessionId,
    user: userObjId,
    refreshTokenHash,
    deviceId: finalDeviceId,
    deviceName: deviceInfo.deviceName,
    browser: deviceInfo.browser,
    browserVersion: deviceInfo.browserVersion,
    os: deviceInfo.os,
    platform: deviceInfo.platform,
    userAgent: deviceInfo.userAgent,
    ipAddress: ip,
    country: geoInfo.country,
    region: geoInfo.region,
    city: geoInfo.city,
    timezone: geoInfo.timezone,
    expiresAt: new Date(Date.now() + SECURITY_CONFIG.REFRESH_TOKEN_MAX_AGE),
    status: 'ACTIVE',
    riskScore,
  });

  if (!deviceExists) {
    const user = await User.findById(userObjId);
    if (user) {
      sendNewDeviceAlert(user, session).catch(err => console.error('Failed to send new device alert email:', err));
    }
  }

  return { session, rawRefreshToken };
};

export const refreshSession = async (
  req: Request,
  session: ISession
): Promise<{ rawRefreshToken: string; newSession: ISession }> => {
  const rawRefreshToken = generateSecureToken();
  const newHash = hashToken(rawRefreshToken);

  session.refreshTokenHash = newHash;
  session.lastActivity = new Date();
  session.expiresAt = new Date(Date.now() + SECURITY_CONFIG.REFRESH_TOKEN_MAX_AGE);
  session.ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || session.ipAddress;
  
  const geoInfo = getGeoFromIP(session.ipAddress);
  session.country = geoInfo.country;
  session.region = geoInfo.region;
  session.city = geoInfo.city;
  session.timezone = geoInfo.timezone;

  await session.save();
  return { rawRefreshToken, newSession: session };
};

export const revokeSession = async (
  sessionId: string,
  reason: string = 'Logged out',
  status: SessionStatus = 'REVOKED',
  req?: Request
): Promise<ISession | null> => {
  const session = await Session.findOne({ sessionId, status: 'ACTIVE' });
  if (!session) return null;

  session.status = status;
  session.logoutReason = reason;
  await session.save();

  // Disconnect active sockets for this session
  if (req) {
    const io = req.app.get('io');
    if (io) {
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        if (s.data.sessionId === sessionId) {
          s.emit('session:revoked', { reason });
          s.disconnect(true);
        }
      }
    }
  }

  return session;
};

export const revokeAllSessions = async (
  userId: string | mongoose.Types.ObjectId,
  exceptSessionId?: string,
  reason: string = 'Forced logout',
  status: SessionStatus = 'REVOKED',
  req?: Request
): Promise<void> => {
  const query: any = { user: userId, status: 'ACTIVE' };
  if (exceptSessionId) {
    query.sessionId = { $ne: exceptSessionId };
  }

  const sessions = await Session.find(query);
  await Session.updateMany(query, { $set: { status, logoutReason: reason } });

  // Disconnect sockets
  if (req) {
    const io = req.app.get('io');
    if (io) {
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        if (s.data.userId === userId.toString() && s.data.sessionId !== exceptSessionId) {
          s.emit('session:revoked', { reason });
          s.disconnect(true);
        }
      }
    }
  }
};

export const detectTokenReuse = async (
  userId: string | mongoose.Types.ObjectId,
  tokenHash: string,
  req: Request
): Promise<void> => {
  // Check if this hashed token exists in any session (even non-active ones)
  const reusedSession = await Session.findOne({ refreshTokenHash: tokenHash });
  if (!reusedSession) return;

  // Revoke everything for safety
  await revokeAllSessions(userId, undefined, 'Suspicious refresh token reuse (theft)', 'SECURITY_REVOKED', req);
  
  // Log event
  await logSecurityEvent({
    user: new mongoose.Types.ObjectId(userId),
    action: 'TOKEN_REUSE',
    sessionId: reusedSession.sessionId,
    deviceName: reusedSession.deviceName,
    browser: reusedSession.browser,
    os: reusedSession.os,
    ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
    result: 'BLOCKED',
    reason: 'Refresh token reuse detected',
    metadata: { reusedTokenHash: tokenHash },
  });

  // Send theft email
  const user = await User.findById(userId);
  if (user) {
    sendTokenTheftAlert(user).catch(err => console.error('Failed to send token theft alert email:', err));
  }
};
