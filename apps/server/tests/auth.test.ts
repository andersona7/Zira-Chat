import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

import authRoutes from '../src/routes/auth.routes';
import { User } from '../src/models/User';
import { Session } from '../src/models/Session';
import { Otp } from '../src/models/Otp';
import { Block } from '../src/models/Block';
import * as emailService from '../src/utils/email.service';
import * as sessionService from '../src/services/session.service';
import * as riskService from '../src/services/risk.service';
import * as securityLogService from '../src/services/security-log.service';
import * as securityEmailService from '../src/services/security-email.service';

// Mock the models to prevent real database interactions during tests
jest.mock('../src/models/User');
jest.mock('../src/models/Session');
jest.mock('../src/models/Otp');
jest.mock('../src/models/Block');
jest.mock('../src/utils/email.service');
jest.mock('../src/services/session.service');
jest.mock('../src/services/risk.service');
jest.mock('../src/services/security-log.service');
jest.mock('../src/services/security-email.service');

// Setup a standalone Express app for testing the router
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRoutes);

// Suppress console logs during testing
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Authentication API Redesign', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test_secret';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
    process.env.GMAIL_USER = 'test@gmail.com';
    jest.clearAllMocks();
    (riskService.assessLoginRisk as jest.Mock).mockResolvedValue({ score: 0, factors: [] });
    (securityLogService.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
    (securityEmailService.sendLoginAlert as jest.Mock).mockResolvedValue(undefined);
    (securityEmailService.sendSuspiciousLoginAlert as jest.Mock).mockResolvedValue(undefined);
    (securityEmailService.sendNewDeviceAlert as jest.Mock).mockResolvedValue(undefined);
    (Block.find as jest.Mock).mockResolvedValue([]);
  });

  describe('POST /api/v1/auth/send-otp', () => {
    it('should successfully send a verification OTP', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null); // No existing user
      (Otp.findOne as jest.Mock).mockResolvedValue(null);  // No cooldown check
      (Otp.create as jest.Mock).mockResolvedValue(true);
      const sendEmailSpy = jest.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalled();
    });

    it('should return 409 if email already exists', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ id: 'existing' });

      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email already registered');
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('should verify OTP successfully', async () => {
      const mockOtpDoc = {
        email: 'test@example.com',
        otpHash: '$2a$10$xyz', // we will mock bcrypt.compare
        attempts: 0,
        save: jest.fn().mockResolvedValue(true),
      };
      (Otp.findOne as jest.Mock).mockResolvedValue(mockOtpDoc);
      
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user after successful email OTP verification', async () => {
      // Mock OTP is verified
      (Otp.findOne as jest.Mock).mockResolvedValue({ email: 'test@example.com', verified: true });
      (User.findOne as jest.Mock).mockResolvedValue(null); // Username is unique
      
      const mockUser = {
        _id: 'new_user_id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'testuser',
        profilePhoto: '',
        bio: 'Hey there!',
        isOnline: false,
        emailVerified: true,
      };
      (User.create as jest.Mock).mockResolvedValue(mockUser);
      (Otp.deleteOne as jest.Mock).mockResolvedValue(true);
      (sessionService.createSession as jest.Mock).mockResolvedValue({
        session: { sessionId: 'session_1', deviceName: 'Chrome on Windows', browser: 'Chrome', os: 'Windows', ipAddress: '127.0.0.1', country: 'US' },
        rawRefreshToken: 'refresh_token_1',
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          otp: '123456',
          fullName: 'Test User',
          username: 'testuser',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.accessToken).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with username and password successfully', async () => {
      const mockUser = {
        _id: 'user_id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'testuser',
        profilePhoto: '',
        bio: 'Hey there!',
        isOnline: false,
        emailVerified: true,
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (sessionService.createSession as jest.Mock).mockResolvedValue({
        session: { sessionId: 'session_2', deviceName: 'Chrome on Windows', browser: 'Chrome', os: 'Windows', ipAddress: '127.0.0.1', country: 'US' },
        rawRefreshToken: 'refresh_token_2',
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });
  });
});
