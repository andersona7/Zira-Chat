import { z } from 'zod';

export const sendOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be exactly 6 characters'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be exactly 6 characters'),
    username: z
      .string()
      .min(5, 'Username must be at least 5 characters')
      .max(20, 'Username cannot exceed 20 characters')
      .regex(/^[A-Za-z0-9_]+$/, 'Username can only contain letters, numbers, and underscore (_)'),
    fullName: z
      .string()
      .min(2, 'Full Name must be at least 2 characters')
      .max(50, 'Full Name cannot exceed 50 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
    deviceId: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    deviceId: z.string().optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
  }),
});

export const verifyForgotPasswordOtpSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    otp: z.string().length(6, 'OTP must be exactly 6 characters'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    otp: z.string().length(6, 'OTP must be exactly 6 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
    logoutAll: z.boolean().default(false),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export const renameDeviceSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Device name cannot be empty').max(50, 'Device name too long'),
  }),
});