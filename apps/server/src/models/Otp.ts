import mongoose, { Schema, Document } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otpHash: string;
  expiresAt: Date;
  type: 'verification' | 'password_reset' | 'account_deletion' | 'lock_reset';
  attempts: number;
  verified: boolean;
  lastSentAt: Date;
}

const otpSchema = new Schema<IOtp>({
  email: { type: String, required: true, index: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB TTL index to expire document at expiresAt
  type: { type: String, enum: ['verification', 'password_reset', 'account_deletion', 'lock_reset'], required: true },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  lastSentAt: { type: Date, default: Date.now },
});

export const Otp = mongoose.model<IOtp>('Otp', otpSchema);
