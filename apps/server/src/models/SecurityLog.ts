import mongoose, { Schema, Document } from 'mongoose';

export type SecurityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REMOTE_LOGOUT'
  | 'FAILED_LOGIN'
  | 'PASSWORD_CHANGE'
  | 'EMAIL_CHANGE'
  | 'USERNAME_CHANGE'
  | 'DEVICE_TRUSTED'
  | 'DEVICE_REMOVED'
  | 'TOKEN_REUSE'
  | 'SECURITY_REVOCATION'
  | 'SESSIONS_REVOKED'
  | 'ALL_SESSIONS_REVOKED';

export interface ISecurityLog extends Document {
  user: mongoose.Types.ObjectId;
  action: SecurityAction;
  sessionId?: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  ipAddress: string;
  country?: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const securityLogSchema = new Schema<ISecurityLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    sessionId: { type: String },
    deviceName: { type: String },
    browser: { type: String },
    os: { type: String },
    ipAddress: { type: String, required: true },
    country: { type: String },
    result: { type: String, enum: ['SUCCESS', 'FAILURE', 'BLOCKED'], required: true },
    reason: { type: String },
    metadata: { type: Schema.Types.Map, of: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

securityLogSchema.index({ user: 1, createdAt: -1 });

export const SecurityLog = mongoose.model<ISecurityLog>('SecurityLog', securityLogSchema);
