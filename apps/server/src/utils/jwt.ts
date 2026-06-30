import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import mongoose from 'mongoose';
import { SECURITY_CONFIG } from '../config/security.constants';

export const generateAccessToken = (
  userId: string | mongoose.Types.ObjectId,
  sessionId: string
): string => {
  const expiresIn = SECURITY_CONFIG.ACCESS_TOKEN_LIFETIME as SignOptions['expiresIn'];

  return jwt.sign(
    { id: userId.toString(), sessionId },
    process.env.JWT_SECRET as string,
    { expiresIn }
  );
};

export const generateRefreshToken = (
  userId: string | mongoose.Types.ObjectId,
  sessionId: string
): string => {
  // Rotate refresh tokens inside the HttpOnly Cookie with absolute limits
  return jwt.sign(
    { id: userId.toString(), sessionId },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: '30d' }
  );
};
