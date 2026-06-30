import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'SYSTEM' | 'CONTACT' | 'GIF';
  content: string; // Also acts as a caption for media
  gifId?: string;
  media?: {
    mediaId?: string;
    url: string;
    publicId: string;
    mimeType: string;
    size: number;
    name: string;
  };
  sharedContact?: {
    userId: mongoose.Types.ObjectId;
    fullName: string;
    username: string;
    profilePhoto?: string;
  };
  status: 'SENT' | 'DELIVERED' | 'READ';
  replyTo?: mongoose.Types.ObjectId;
  forwarded?: boolean;
  isPinned: boolean;
  starredBy: mongoose.Types.ObjectId[];
  reactions: { userId: mongoose.Types.ObjectId; emoji: string }[];
  deliveredAt?: Date;
  seenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedFor: mongoose.Types.ObjectId[];
  clientId?: string;
}

const messageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'SYSTEM', 'CONTACT', 'GIF'], default: 'TEXT' },
    content: { type: String, default: '' },
    gifId: { type: String },
    media: {
      mediaId: String,
      url: String,
      publicId: String,
      mimeType: String,
      size: Number,
      name: String,
    },
    sharedContact: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      fullName: String,
      username: String,
      profilePhoto: String,
    },
    status: { type: String, enum: ['SENT', 'DELIVERED', 'READ'], default: 'SENT' },
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    forwarded: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    starredBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
    deliveredAt: { type: Date },
    seenAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    clientId: { type: String, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

messageSchema.index({ chatId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);