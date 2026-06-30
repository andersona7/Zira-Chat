import mongoose, { Schema } from 'mongoose';

export interface IMedia {
  _id: string; // Cryptographically secure identifier (e.g. UUIDv4)
  cloudinaryPublicId: string;
  ownerId: mongoose.Types.ObjectId;
  messageId?: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'AVATAR' | 'STATUS';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  checksum: string; // SHA256
  encryptedFilename: string;
  referenceCount: number;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    _id: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', index: true },
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', index: true },
    mediaType: {
      type: String,
      enum: ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'AVATAR', 'STATUS'],
      required: true,
    },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number },
    checksum: { type: String, required: true },
    encryptedFilename: { type: String, required: true },
    referenceCount: { type: Number, default: 1 },
    deletedAt: { type: Date },
  },
  { timestamps: true, _id: false }
);

export const Media = mongoose.model<IMedia>('Media', mediaSchema);
export default Media;
