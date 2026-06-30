import mongoose, { Schema, Document } from 'mongoose';

export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'LOGGED_OUT' | 'REVOKED' | 'PASSWORD_CHANGED' | 'SECURITY_REVOKED';

export interface ISession extends Document {
  sessionId: string;
  user: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  deviceId: string;
  deviceName: string;
  browser: string;
  browserVersion: string;
  os: string;
  platform: string;
  userAgent: string;
  ipAddress: string;
  country: string;
  region: string;
  city: string;
  timezone: string;
  loginAt: Date;
  lastActivity: Date;
  lastSeen: Date;
  expiresAt: Date;
  status: SessionStatus;
  isTrusted: boolean;
  logoutReason?: string;
  riskScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true, index: true },
    deviceId: { type: String, required: true },
    deviceName: { type: String, required: true },
    browser: { type: String, required: true },
    browserVersion: { type: String, required: true },
    os: { type: String, required: true },
    platform: { type: String, required: true },
    userAgent: { type: String, required: true },
    ipAddress: { type: String, required: true },
    country: { type: String, required: true },
    region: { type: String, required: true },
    city: { type: String, required: true },
    timezone: { type: String, required: true },
    loginAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'LOGGED_OUT', 'REVOKED', 'PASSWORD_CHANGED', 'SECURITY_REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    isTrusted: { type: Boolean, default: false },
    logoutReason: { type: String },
    riskScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for query performance
sessionSchema.index({ user: 1, status: 1 });
sessionSchema.index({ user: 1, deviceId: 1 });

export const Session = mongoose.model<ISession>('Session', sessionSchema);