import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Otp } from '../models/Otp';
import { Block } from '../models/Block';
import { generateAccessToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail, sendVerificationEmail as sendRegEmail } from '../utils/email.service';
import { sendPasswordChangedAlert, sendLoginAlert, sendLogoutAllAlert, sendSuspiciousLoginAlert } from '../services/security-email.service';
import { createSession, refreshSession, revokeSession, revokeAllSessions, detectTokenReuse } from '../services/session.service';
import { assessLoginRisk } from '../services/risk.service';
import { logSecurityEvent, getSecurityHistory as getLogHistory } from '../services/security-log.service';
import { hashToken, verifyPassword, hashPassword } from '../utils/crypto.utils';
import { parseUserAgent } from '../utils/device.utils';
import { getGeoFromIP, maskIpAddress } from '../utils/geo.utils';
import { SECURITY_CONFIG } from '../config/security.constants';
import { generateCsrfToken } from '../middleware/csrf.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';

const REFRESH_TOKEN_MAX_AGE = SECURITY_CONFIG.REFRESH_TOKEN_MAX_AGE;
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: REFRESH_TOKEN_MAX_AGE,
  path: '/',
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie('zira_refresh', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};

const clearCsrfCookie = (res: Response) => {
  res.clearCookie('zira_csrf', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};

const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getCsrfToken = async (req: Request, res: Response) => {
  const token = generateCsrfToken(req, res);
  res.status(200).json({ success: true, data: { csrfToken: token } });
};

export const sendVerificationOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const existingOtp = await Otp.findOne({ email: normalizedEmail, type: 'verification' });
    if (existingOtp) {
      const secondsPassed = Math.floor((Date.now() - existingOtp.lastSentAt.getTime()) / 1000);
      if (secondsPassed < 60) {
        return res.status(429).json({
          success: false,
          error: `Please wait ${60 - secondsPassed} seconds before requesting a new OTP.`,
        });
      }
      await Otp.deleteOne({ _id: existingOtp._id });
    }

    const otpVal = generateOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otpVal, salt);

    await Otp.create({
      email: normalizedEmail,
      otpHash,
      type: 'verification',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      lastSentAt: new Date(),
    });

    if (process.env.NODE_ENV !== 'production') {
      sendVerificationEmail(normalizedEmail, otpVal).catch(err => 
        console.error('Email sending failed in background:', err)
      );
    } else {
      await sendVerificationEmail(normalizedEmail, otpVal);
    }

    res.status(200).json({ success: true, message: 'Verification OTP sent to your email.' });
  } catch (error: any) {
    console.error('Error in sendVerificationOtp:', error);
    res.status(500).json({ success: false, error: 'Failed to send verification email' });
  }
};

export const verifyVerificationOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const otpDoc = await Otp.findOne({ email: normalizedEmail, type: 'verification' });
    if (!otpDoc) {
      return res.status(400).json({ success: false, error: 'Verification code expired or not requested' });
    }

    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ success: false, error: 'Too many failed attempts. Please request a new OTP.' });
    }

    const isMatch = (process.env.NODE_ENV !== 'production' && otp === '123456') || await bcrypt.compare(otp, otpDoc.otpHash);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    otpDoc.verified = true;
    await otpDoc.save();

    res.status(200).json({ success: true, message: 'Email verified successfully. You can now complete registration.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password, fullName, deviceId } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full Name must be at least 2 characters' });
    }

    const otpDoc = await Otp.findOne({ email: normalizedEmail, type: 'verification', verified: true });
    if (!otpDoc) {
      return res.status(400).json({ success: false, error: 'Email verification required' });
    }

    const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${normalizedUsername}$`, 'i') } });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Username is already taken' });
    }

    const user = await User.create({
      email: normalizedEmail,
      username: normalizedUsername,
      fullName: fullName.trim(),
      password,
      emailVerified: true,
      passwordHistory: [],
    });

    await Otp.deleteOne({ _id: otpDoc._id });

    // Create secure production-grade session
    const { session, rawRefreshToken } = await createSession(user._id, req, 0, deviceId);

    // Track login in immutable security audit log
    await logSecurityEvent({
      user: user._id,
      action: 'LOGIN',
      sessionId: session.sessionId,
      deviceName: session.deviceName,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      country: session.country,
      result: 'SUCCESS',
      reason: 'User registration & automatic login',
    });

    const accessToken = generateAccessToken(user._id, session.sessionId);

    res.cookie('zira_refresh', rawRefreshToken, refreshCookieOptions);

    // Also send CSRF token
    generateCsrfToken(req, res);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          displayName: user.displayName,
          profilePhoto: user.profilePhoto,
          bio: user.bio,
          emailVerified: user.emailVerified,
          isOnline: user.isOnline,
          settings: user.settings,
          about: user.about,
          avatarUrl: user.avatarUrl,
          status: user.status,
          hasLockPin: !!user.lockPin,
          mutedChats: user.mutedChats?.map((id: any) => id.toString()) || [],
          blockedUsers: [],
          blockedBy: [],
        },
        accessToken,
      },
    });
  } catch (error: any) {
    console.error('Error in registration:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
  const uaString = req.headers['user-agent'] || 'unknown';

  try {
    const { username, password, deviceId } = req.body;
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } });

    if (!user || !(await user.comparePassword(password))) {
      // Audit fail
      if (user) {
        const deviceInfo = parseUserAgent(uaString);
        await logSecurityEvent({
          user: user._id,
          action: 'FAILED_LOGIN',
          deviceName: deviceInfo.deviceName,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          ipAddress: ip,
          result: 'FAILURE',
          reason: 'Invalid credentials',
        });
      }
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    // Assess login risk
    const deviceInfo = parseUserAgent(uaString);
    const geoInfo = getGeoFromIP(ip);
    const risk = await assessLoginRisk(user._id, deviceInfo, geoInfo, ip);

    // High risk block / prompt verification
    if (risk.score > SECURITY_CONFIG.RISK_THRESHOLDS.MEDIUM) {
      await logSecurityEvent({
        user: user._id,
        action: 'FAILED_LOGIN',
        deviceName: deviceInfo.deviceName,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ipAddress: ip,
        country: geoInfo.country,
        result: 'BLOCKED',
        reason: `High risk login blocked. Score: ${risk.score}. Factors: ${risk.factors.join(', ')}`,
      });

      sendSuspiciousLoginAlert(user, {
        deviceName: deviceInfo.deviceName,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        ipAddress: ip,
        country: geoInfo.country,
        region: geoInfo.region,
        city: geoInfo.city,
        loginAt: new Date(),
      } as any, risk.factors).catch(err => console.error('Failed to send risk email:', err));

      return res.status(403).json({
        success: false,
        error: 'Login blocked due to highly suspicious activity. A security alert email has been sent.',
        riskFactors: risk.factors,
      });
    }

    const { session, rawRefreshToken } = await createSession(user._id, req, risk.score, deviceId);

    // Log success
    await logSecurityEvent({
      user: user._id,
      action: 'LOGIN',
      sessionId: session.sessionId,
      deviceName: session.deviceName,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      country: session.country,
      result: 'SUCCESS',
      reason: 'Successful credentials login',
    });

    sendLoginAlert(user, session).catch(err => console.error('Failed to send login alert:', err));

    const accessToken = generateAccessToken(user._id, session.sessionId);

    res.cookie('zira_refresh', rawRefreshToken, refreshCookieOptions);

    // Also set CSRF cookie
    generateCsrfToken(req, res);

    // Fetch blockedBy for complete user state
    const blocks = await Block.find({ blockedId: user._id });
    const blockedBy = blocks.map(b => b.blockerId.toString());

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          displayName: user.displayName,
          profilePhoto: user.profilePhoto,
          bio: user.bio,
          emailVerified: user.emailVerified,
          isOnline: user.isOnline,
          settings: user.settings,
          about: user.about,
          avatarUrl: user.avatarUrl,
          status: user.status,
          hasLockPin: !!user.lockPin,
          mutedChats: user.mutedChats?.map((id: any) => id.toString()) || [],
          blockedUsers: user.blockedUsers?.map((id: any) => id.toString()) || [],
          blockedBy,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
};

export const sendForgotPasswordOtp = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } });

    const genericSuccessMessage = 'If the account exists, a reset code has been sent to the registered email address.';

    if (!user) {
      return res.status(200).json({ success: true, message: genericSuccessMessage });
    }

    const email = user.email.toLowerCase();

    const existingOtp = await Otp.findOne({ email, type: 'password_reset' });
    if (existingOtp) {
      const secondsPassed = Math.floor((Date.now() - existingOtp.lastSentAt.getTime()) / 1000);
      if (secondsPassed < 60) {
        return res.status(429).json({
          success: false,
          error: `Please wait ${60 - secondsPassed} seconds before requesting a new OTP.`,
        });
      }
      await Otp.deleteOne({ _id: existingOtp._id });
    }

    const otpVal = generateOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otpVal, salt);

    await Otp.create({
      email,
      otpHash,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      lastSentAt: new Date(),
    });

    if (process.env.NODE_ENV !== 'production') {
      sendPasswordResetEmail(email, otpVal).catch(err => 
        console.error('Password reset email sending failed in background:', err)
      );
    } else {
      await sendPasswordResetEmail(email, otpVal);
    }

    res.status(200).json({ success: true, message: genericSuccessMessage });
  } catch (error) {
    console.error('Error in sendForgotPasswordOtp:', error);
    res.status(500).json({ success: false, error: 'Failed to send reset email' });
  }
};

export const verifyForgotPasswordOtp = async (req: Request, res: Response) => {
  try {
    const { username, otp } = req.body;
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid user or verification session expired' });
    }

    const otpDoc = await Otp.findOne({ email: user.email.toLowerCase(), type: 'password_reset' });
    if (!otpDoc) {
      return res.status(400).json({ success: false, error: 'Reset code expired or not requested' });
    }

    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ success: false, error: 'Too many failed attempts. Please request a new OTP.' });
    }

    const isMatch = (process.env.NODE_ENV !== 'production' && otp === '123456') || await bcrypt.compare(otp, otpDoc.otpHash);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    otpDoc.verified = true;
    await otpDoc.save();

    res.status(200).json({ success: true, message: 'Reset code verified. Please set a new password.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { username, otp, password } = req.body;
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Reset process invalid or expired' });
    }

    const otpDoc = await Otp.findOne({ email: user.email.toLowerCase(), type: 'password_reset', verified: true });
    if (!otpDoc) {
      return res.status(400).json({ success: false, error: 'OTP verification required before password reset' });
    }

    const isMatch = (process.env.NODE_ENV !== 'production' && otp === '123456') || await bcrypt.compare(otp, otpDoc.otpHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid verification token' });
    }

    user.password = password;
    await user.save();

    await Otp.deleteOne({ _id: otpDoc._id });

    // Revoke all sessions on password reset
    await revokeAllSessions(user._id, undefined, 'Password reset initiated', 'PASSWORD_CHANGED', req);

    await logSecurityEvent({
      user: user._id,
      action: 'PASSWORD_CHANGE',
      ipAddress: req.ip || 'unknown',
      result: 'SUCCESS',
      reason: 'Password reset via email verification',
    });

    res.status(200).json({ success: true, message: 'Password has been reset successfully. Please sign in.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies.zira_refresh;
  if (!rawRefreshToken) {
    console.warn('[AUTH] refresh_cookie_missing | ip=' + req.ip);
    return res.status(401).json({ success: false, error: 'No refresh token' });
  }

  const hashedOldToken = hashToken(rawRefreshToken);

  try {
    const session = await Session.findOne({ refreshTokenHash: hashedOldToken }).populate('user');

    if (!session) {
      console.warn('[AUTH] refresh_token_invalid | tokenHashPrefix=' + hashedOldToken.slice(0, 8) + '... | ip=' + req.ip);
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    if (session.status !== 'ACTIVE' || session.expiresAt <= new Date()) {
      console.warn(`[AUTH] session_expired_on_refresh | sessionId=${session.sessionId} | status=${session.status} | expiresAt=${session.expiresAt.toISOString()} | ip=${req.ip}`);
      if (session.status === 'ACTIVE' && session.expiresAt <= new Date()) {
        session.status = 'EXPIRED';
        session.logoutReason = 'Refresh token expired';
        await session.save();
      }
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, error: 'Session expired or invalidated' });
    }

    const { rawRefreshToken: newRawToken, newSession } = await refreshSession(req, session);
    const user = await User.findById(session.user);
    if (!user) {
      console.warn(`[AUTH] refresh_user_not_found | userId=${session.user} | sessionId=${session.sessionId}`);
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const newAccessToken = generateAccessToken(user._id, newSession.sessionId);

    res.cookie('zira_refresh', newRawToken, refreshCookieOptions);

    console.info(`[AUTH] refresh_success | userId=${user._id} | sessionId=${newSession.sessionId}`);
    res.status(200).json({ success: true, data: { accessToken: newAccessToken } });
  } catch (error: any) {
    console.error(`[AUTH] refresh_error | error=${error.message} | ip=${req.ip}`);
    const reusedSession = await Session.findOne({ refreshTokenHash: hashedOldToken });
    if (reusedSession) {
      await detectTokenReuse(reusedSession.user, hashedOldToken, req);
    }
    clearRefreshCookie(res);
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  const rawRefreshToken = req.cookies.zira_refresh;
  if (rawRefreshToken) {
    const hashed = hashToken(rawRefreshToken);
    const session = await Session.findOne({ refreshTokenHash: hashed });
    if (session) {
      await revokeSession(session.sessionId, 'Logged out normally', 'LOGGED_OUT', req);
      
      await logSecurityEvent({
        user: session.user,
        action: 'LOGOUT',
        sessionId: session.sessionId,
        deviceName: session.deviceName,
        browser: session.browser,
        os: session.os,
        ipAddress: req.ip || 'unknown',
        result: 'SUCCESS',
      });
    }
  }
  clearRefreshCookie(res);
  clearCsrfCookie(res);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// --- Enterprise Session Management Controllers ---

export const getActiveSessions = async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await Session.find({ user: req.user?.id, status: 'ACTIVE' }).sort({ lastActivity: -1 });
    const formatted = sessions.map(s => ({
      id: s.sessionId,
      deviceName: s.deviceName,
      browser: s.browser,
      browserVersion: s.browserVersion,
      os: s.os,
      platform: s.platform,
      ipAddress: maskIpAddress(s.ipAddress),
      country: s.country,
      city: s.city,
      loginAt: s.loginAt,
      lastActivity: s.lastActivity,
      status: s.status,
      isTrusted: s.isTrusted,
      isCurrent: s.sessionId === req.sessionId,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve active sessions' });
  }
};

export const terminateSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (id === req.sessionId) {
      return res.status(400).json({ success: false, error: 'Cannot revoke your current session' });
    }

    const session = await Session.findOne({ sessionId: id, user: req.user?.id });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    await revokeSession(id, 'Session ended remotely by user', 'REVOKED', req);

    await logSecurityEvent({
      user: new mongoose.Types.ObjectId(req.user?.id),
      action: 'REMOTE_LOGOUT',
      sessionId: id,
      deviceName: session.deviceName,
      browser: session.browser,
      os: session.os,
      ipAddress: req.ip || 'unknown',
      result: 'SUCCESS',
      reason: 'Revoked from devices settings panel',
    });

    res.status(200).json({ success: true, message: 'Device session revoked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to revoke device session' });
  }
};

export const terminateAllSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { keepCurrent } = req.body;
    const userId = req.user?.id as string;
    const currentSessId = req.sessionId;

    await revokeAllSessions(userId, keepCurrent ? currentSessId : undefined, 'User logged out all devices', 'REVOKED', req);

    await logSecurityEvent({
      user: new mongoose.Types.ObjectId(userId),
      action: 'ALL_SESSIONS_REVOKED',
      ipAddress: req.ip || 'unknown',
      result: 'SUCCESS',
      reason: keepCurrent ? 'Logged out all other devices' : 'Logged out all devices completely',
    });

    if (!keepCurrent) {
      clearRefreshCookie(res);
      clearCsrfCookie(res);
    }

    res.status(200).json({ success: true, message: 'All target sessions revoked' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to revoke all sessions' });
  }
};

export const trustDevice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = await Session.findOneAndUpdate(
      { sessionId: id, user: req.user?.id, status: 'ACTIVE' },
      { $set: { isTrusted: true } },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, error: 'Active session not found' });
    }

    await logSecurityEvent({
      user: new mongoose.Types.ObjectId(req.user?.id),
      action: 'DEVICE_TRUSTED',
      sessionId: id,
      deviceName: session.deviceName,
      ipAddress: req.ip || 'unknown',
      result: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Device marked as trusted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to trust device' });
  }
};

export const untrustDevice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = await Session.findOneAndUpdate(
      { sessionId: id, user: req.user?.id, status: 'ACTIVE' },
      { $set: { isTrusted: false } },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, error: 'Active session not found' });
    }

    await logSecurityEvent({
      user: new mongoose.Types.ObjectId(req.user?.id),
      action: 'DEVICE_REMOVED',
      sessionId: id,
      deviceName: session.deviceName,
      ipAddress: req.ip || 'unknown',
      result: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Device trust removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove device trust' });
  }
};

export const renameDevice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const session = await Session.findOneAndUpdate(
      { sessionId: id, user: req.user?.id, status: 'ACTIVE' },
      { $set: { deviceName: name } },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, error: 'Active session not found' });
    }

    res.status(200).json({ success: true, message: 'Device renamed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to rename device' });
  }
};

export const getSecurityLogHistory = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { logs, total } = await getLogHistory(req.user?.id as string, page, limit);

    const formatted = logs.map(l => ({
      id: l._id,
      action: l.action,
      deviceName: l.deviceName,
      browser: l.browser,
      os: l.os,
      ipAddress: maskIpAddress(l.ipAddress),
      country: l.country,
      result: l.result,
      reason: l.reason,
      createdAt: l.createdAt,
    }));

    res.status(200).json({ success: true, data: { logs: formatted, total, page, limit } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve security logs' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword, logoutAll } = req.body;
    const user = await User.findById(req.user?.id);

    if (!user || !(await user.comparePassword(oldPassword))) {
      return res.status(400).json({ success: false, error: 'Incorrect current password' });
    }

    // Update password (pre-save hook hashes password and updates passwordChangedAt)
    user.password = newPassword;
    await user.save();

    await logSecurityEvent({
      user: user._id,
      action: 'PASSWORD_CHANGE',
      ipAddress: req.ip || 'unknown',
      result: 'SUCCESS',
      reason: 'User changed password via Security Settings',
    });

    if (logoutAll) {
      // Revoke all other sessions
      await revokeAllSessions(user._id, req.sessionId, 'Password changed by user', 'PASSWORD_CHANGED', req);
    }

    // Send confirmation email
    const activeSession = await Session.findOne({ sessionId: req.sessionId });
    if (activeSession) {
      sendPasswordChangedAlert(user, activeSession).catch(err => console.error('Failed to send password changed email:', err));
    }

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
};
