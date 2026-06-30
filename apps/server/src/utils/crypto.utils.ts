import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateSecureToken = (): string => {
  return crypto.randomBytes(48).toString('hex');
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateDeviceId = (): string => {
  return crypto.randomUUID();
};

export const generateSessionId = (): string => {
  return crypto.randomUUID();
};
