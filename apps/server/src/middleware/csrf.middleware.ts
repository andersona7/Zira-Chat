import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Basic Double Submit Cookie CSRF protection.
 * Auth state changes from the frontend must include the 'x-csrf-token' header
 * matching the 'zira_csrf' cookie value.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Safe methods do not require validation
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfCookie = req.cookies.zira_csrf;
  const csrfHeader = req.headers['x-csrf-token'] as string;

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ success: false, error: 'CSRF token validation failed' });
  }

  next();
};

export const generateCsrfToken = (req: Request, res: Response) => {
  const token = crypto.randomBytes(24).toString('hex');
  res.cookie('zira_csrf', token, {
    httpOnly: false, // Must be readable by frontend to send back in header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
  return token;
};
