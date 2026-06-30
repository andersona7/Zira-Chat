import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  user: mongoose.Types.ObjectId;
  contactUser: mongoose.Types.ObjectId;
  customName?: string;
  isBlocked: boolean;
  isFavourite: boolean;
  isMuted: boolean;
  isLocked: boolean;
  lockPin?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contactUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customName: { type: String, trim: true },
    isBlocked: { type: Boolean, default: false },
    isFavourite: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    lockPin: { type: String },
  },
  { timestamps: true }
);

// Prevent adding the same user twice
contactSchema.index({ user: 1, contactUser: 1 }, { unique: true });

export const Contact = mongoose.model<IContact>('Contact', contactSchema);