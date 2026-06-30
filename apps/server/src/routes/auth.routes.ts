import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  sendVerificationOtp,
  verifyVerificationOtp,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  getCsrfToken,
  getActiveSessions,
  terminateSession,
  terminateAllSessions,
  trustDevice,
  untrustDevice,
  renameDevice,
  getSecurityLogHistory,
  changePassword,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { csrfProtection } from '../middleware/csrf.middleware';
import {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  verifyForgotPasswordOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
  renameDeviceSchema,
} from '../schemas/auth.schema';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per 15 minutes
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  keyPrefix: 'auth_limiter',
});

const otpLimiter = rateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Limit OTP requests to 10 per 10 minutes per IP
  message: 'Too many OTP requests. Please try again later.',
  keyPrefix: 'otp_limiter',
});

// CSRF Endpoint
router.get('/csrf-token', getCsrfToken);

// Registration Flow routes
router.post('/send-otp', otpLimiter, validate(sendOtpSchema), sendVerificationOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyVerificationOtp);
router.post('/register', authLimiter, validate(registerSchema), register);

// Login Flow route
router.post('/login', authLimiter, validate(loginSchema), login);

// Forgot & Reset Password routes
router.post('/forgot-password/send-otp', otpLimiter, validate(forgotPasswordSchema), sendForgotPasswordOtp);
router.post('/forgot-password/verify-otp', authLimiter, validate(verifyForgotPasswordOtpSchema), verifyForgotPasswordOtp);
router.post('/forgot-password/reset', authLimiter, validate(resetPasswordSchema), resetPassword);

// Session routes
router.post('/refresh', refresh);
router.post('/logout', logout);

// Enterprise Device & Security Management (Protected + CSRF)
router.get('/sessions', requireAuth, getActiveSessions);
router.delete('/sessions/:id', requireAuth, csrfProtection, terminateSession);
router.delete('/sessions', requireAuth, csrfProtection, terminateAllSessions);
router.patch('/sessions/:id/trust', requireAuth, csrfProtection, trustDevice);
router.patch('/sessions/:id/untrust', requireAuth, csrfProtection, untrustDevice);
router.patch('/sessions/:id/rename', requireAuth, csrfProtection, validate(renameDeviceSchema), renameDevice);
router.get('/security-log', requireAuth, getSecurityLogHistory);
router.post('/change-password', requireAuth, csrfProtection, validate(changePasswordSchema), changePassword);

export default router;