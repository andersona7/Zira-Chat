import mongoose, { Schema, Document } from 'mongoose';

export interface IStatus extends Document {
  user: mongoose.Types.ObjectId;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
  content?: string;
  media?: {
    mediaId?: string;
    url: string;
    publicId: string;
    mimeType: string;
    size: number;
    name: string;
  };
  backgroundColor?: string;
  viewers: mongoose.Types.ObjectId[];
  createdAt: Date;
  expiresAt: Date;
}

const statusSchema = new Schema<IStatus>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['TEXT', 'IMAGE', 'VIDEO'], required: true },
    content: { type: String },
    media: {
      mediaId: String,
      url: String,
      publicId: String,
      mimeType: String,
      size: Number,
      name: String,
    },
    backgroundColor: { type: String, default: '#8B5CF6' },
    viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { 
      type: Date, 
      required: true,
      index: true
    },
  },
  { timestamps: true }
);

export const Status = mongoose.model<IStatus>('Status', statusSchema);