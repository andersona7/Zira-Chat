import mongoose, { Schema, Document } from 'mongoose';

export interface IGifRecent extends Document {
  userId: mongoose.Types.ObjectId;
  gifId: string;
  usedAt: Date;
}

const gifRecentSchema = new Schema<IGifRecent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gifId: { type: String, required: true },
    usedAt: { type: Date, default: Date.now },
  }
);

// Index for quick sorting and retrieval of most recent GIFs
gifRecentSchema.index({ userId: 1, usedAt: -1 });
gifRecentSchema.index({ userId: 1, gifId: 1 }, { unique: true });

export const GifRecent = mongoose.model<IGifRecent>('GifRecent', gifRecentSchema);
