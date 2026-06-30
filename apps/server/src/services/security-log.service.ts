import { ISecurityLog, SecurityLog, SecurityAction } from '../models/SecurityLog';
import mongoose from 'mongoose';

interface LogEventOptions {
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
}

export const logSecurityEvent = async (options: LogEventOptions): Promise<ISecurityLog> => {
  return SecurityLog.create({
    user: options.user,
    action: options.action,
    sessionId: options.sessionId,
    deviceName: options.deviceName,
    browser: options.browser,
    os: options.os,
    ipAddress: options.ipAddress,
    country: options.country,
    result: options.result,
    reason: options.reason,
    metadata: options.metadata,
  });
};

export const getSecurityHistory = async (
  userId: string | mongoose.Types.ObjectId,
  page: number = 1,
  limit: number = 20
): Promise<{ logs: ISecurityLog[]; total: number }> => {
  const query = { user: new mongoose.Types.ObjectId(userId) };
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    SecurityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    SecurityLog.countDocuments(query),
  ]);

  return { logs, total };
};
