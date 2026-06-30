import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Session } from '../models/Session';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  user?: { id: string };
  sessionId?: string;
}

/**
 * Grace period (in seconds) to allow for clock skew between token issuance
 * and the passwordChangedAt timestamp written during user registration/save.
 */
const PASSWORD_CHANGE_GRACE_SECONDS = 5;

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[AUTH] token_missing | path=${req.path} | ip=${req.ip}`);
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; sessionId?: string };
    
    if (!decoded.sessionId) {
      console.warn(`[AUTH] invalid_session_claim | userId=${decoded.id} | path=${req.path}`);
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token session claim' });
    }

    // 1. Validate session status in DB
    const session = await Session.findOne({ sessionId: decoded.sessionId, user: decoded.id });
    if (!session || session.status !== 'ACTIVE') {
      console.warn(`[AUTH] session_revoked | userId=${decoded.id} | sessionId=${decoded.sessionId} | sessionStatus=${session?.status ?? 'NOT_FOUND'} | path=${req.path}`);
      return res.status(401).json({ success: false, error: 'Unauthorized: Session revoked or expired' });
    }

    // 2. Validate password change time vs token creation time
    const user = await User.findById(decoded.id);
    if (!user) {
      console.warn(`[AUTH] user_not_found | userId=${decoded.id} | path=${req.path}`);
      return res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
    }

    const payload = jwt.decode(token) as { iat?: number };
    if (payload && payload.iat && user.passwordChangedAt) {
      const tokenIssuedAtSeconds = payload.iat;
      const passwordChangedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      // Allow a grace period to handle registration/save timing edge cases
      if (tokenIssuedAtSeconds < passwordChangedAtSeconds - PASSWORD_CHANGE_GRACE_SECONDS) {
        console.warn(`[AUTH] password_changed | userId=${decoded.id} | tokenIat=${tokenIssuedAtSeconds} | pwChangedAt=${passwordChangedAtSeconds} | delta=${passwordChangedAtSeconds - tokenIssuedAtSeconds}s | path=${req.path}`);
        return res.status(401).json({ success: false, error: 'Unauthorized: Credentials recently changed. Please login again.' });
      }
    }

    // Debounce updating last activity to avoid excessive database writes (e.g. only update every 60 seconds)
    const now = new Date();
    if (now.getTime() - session.lastActivity.getTime() > 60 * 1000) {
      session.lastActivity = now;
      session.save().catch(err => console.error('Failed to update session activity timestamp:', err));
    }

    req.user = { id: decoded.id };
    req.sessionId = decoded.sessionId;
    next();
  } catch (error: any) {
    const errorType = error.name === 'TokenExpiredError' ? 'expired_token'
      : error.name === 'JsonWebTokenError' ? 'invalid_signature'
      : 'unknown_error';
    console.warn(`[AUTH] ${errorType} | error=${error.message} | path=${req.path} | ip=${req.ip}`);
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};