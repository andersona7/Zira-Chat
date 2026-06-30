import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  username: string;
  fullName: string;
  password?: string;
  profilePhoto: string;
  bio: string;
  isOnline: boolean;
  emailVerified: boolean;
  lastSeen: Date;
  settings: {
    theme: 'light' | 'dark' | 'system';
    notifications: {
      sound: boolean;
      browser: boolean;
    };
    privacy: {
      lastSeen: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
      profilePhoto: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
      readReceipts: boolean;
    };
  };
  mutedChats: mongoose.Types.ObjectId[];
  blockedUsers: mongoose.Types.ObjectId[];
  lockPin?: string;
  passwordChangedAt?: Date;
  passwordHistory?: string[];

  // Compatibility virtual fields for frontend/controllers
  displayName: string;
  about: string;
  avatarUrl: string;
  status: 'ONLINE' | 'OFFLINE';

  comparePassword(attempt: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true },
    username: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    password: { type: String, required: true },
    profilePhoto: { type: String, default: '' },
    bio: { type: String, default: 'Hey there! I am using Zira Chat.' },
    isOnline: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    settings: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      notifications: {
        sound: { type: Boolean, default: true },
        browser: { type: Boolean, default: true },
      },
      privacy: {
        lastSeen: { type: String, enum: ['EVERYONE', 'CONTACTS', 'NOBODY'], default: 'EVERYONE' },
        profilePhoto: { type: String, enum: ['EVERYONE', 'CONTACTS', 'NOBODY'], default: 'EVERYONE' },
        readReceipts: { type: Boolean, default: true },
      }
    },
    mutedChats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lockPin: { type: String },
    passwordChangedAt: { type: Date },
    passwordHistory: { type: [String], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtuals for compatibility
userSchema.virtual('displayName')
  .get(function () {
    return this.fullName || '';
  })
  .set(function (val: string) {
    this.fullName = val;
  });

userSchema.virtual('about')
  .get(function () {
    return this.bio;
  })
  .set(function (val: string) {
    this.bio = val;
  });

userSchema.virtual('avatarUrl')
  .get(function () {
    return this.profilePhoto;
  })
  .set(function (val: string) {
    this.profilePhoto = val;
  });

userSchema.virtual('status')
  .get(function () {
    return this.isOnline ? 'ONLINE' : 'OFFLINE';
  })
  .set(function (val: string) {
    this.isOnline = val === 'ONLINE';
  });

userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  const { hashPassword } = await import('../utils/crypto.utils');
  this.password = await hashPassword(this.password);
  this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = async function (attempt: string): Promise<boolean> {
  if (!this.password) return false;
  const { verifyPassword } = await import('../utils/crypto.utils');
  return await verifyPassword(attempt, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);