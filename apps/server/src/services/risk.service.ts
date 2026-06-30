import { Session } from '../models/Session';
import mongoose from 'mongoose';

export interface RiskAssessment {
  score: number;
  factors: string[];
}

export const assessLoginRisk = async (
  userId: string | mongoose.Types.ObjectId,
  deviceInfo: { browser: string; os: string; platform: string },
  geoInfo: { country: string; city: string; timezone: string },
  ipAddress: string
): Promise<RiskAssessment> => {
  const userObjId = new mongoose.Types.ObjectId(userId);
  let score = 0;
  const factors: string[] = [];

  // Find previous successful, active or completed sessions for risk assessment
  const pastSessions = await Session.find({ user: userObjId }).limit(50);

  if (pastSessions.length === 0) {
    // Brand new user/account
    return { score: 10, factors: ['First login on brand new account'] };
  }

  // 1. New Country Check
  const countries = new Set(pastSessions.map(s => s.country).filter(Boolean));
  if (countries.size > 0 && !countries.has(geoInfo.country)) {
    score += 40;
    factors.push(`Unusual login country: ${geoInfo.country}`);
  }

  // 2. New OS Check
  const osList = new Set(pastSessions.map(s => s.os).filter(Boolean));
  if (osList.size > 0 && !osList.has(deviceInfo.os)) {
    score += 20;
    factors.push(`New operating system detected: ${deviceInfo.os}`);
  }

  // 3. New Browser Check
  const browsers = new Set(pastSessions.map(s => s.browser).filter(Boolean));
  if (browsers.size > 0 && !browsers.has(deviceInfo.browser)) {
    score += 15;
    factors.push(`New browser detected: ${deviceInfo.browser}`);
  }

  // 4. Impossible Travel Check (extremely simplified)
  // Check if there was a session from a different country/city within the last 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSessions = pastSessions.filter(s => s.lastActivity > oneHourAgo && s.ipAddress !== ipAddress);
  for (const recent of recentSessions) {
    if (recent.country !== geoInfo.country || recent.city !== geoInfo.city) {
      score += 50;
      factors.push(`Impossible travel detected (recently logged in from ${recent.city || 'another city'}, ${recent.country})`);
      break; // Only add once
    }
  }

  // Clamp score between 0 and 100
  score = Math.min(Math.max(score, 0), 100);

  return { score, factors };
};
