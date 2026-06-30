import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  type: 'DIRECT' | 'GROUP';
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  unreadCounts: Map<string, number>;
  groupMetadata?: {
    name: string;
    description?: string;
    avatarUrl?: string;
    admins: mongoose.Types.ObjectId[];
  };
  deletedFor: mongoose.Types.ObjectId[];
  directKey?: string;
  isLocked: boolean;
  lockedBy?: mongoose.Types.ObjectId;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    type: { type: String, enum: ['DIRECT', 'GROUP'], required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    unreadCounts: { type: Map, of: Number, default: new Map() },
    groupMetadata: {
      name: String,
      description: String,
      avatarUrl: String,
      admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    directKey: { type: String, unique: true, sparse: true },
    isLocked: { type: Boolean, default: false },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lockedAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });

export const Chat = mongoose.model<IChat>('Chat', chatSchema);