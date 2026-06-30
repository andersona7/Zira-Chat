import mongoose, { Schema, Document } from 'mongoose';

export interface IGifFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  gifId: string;
  createdAt: Date;
}

const gifFavoriteSchema = new Schema<IGifFavorite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gifId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Ensure a user can only favorite a specific GIF once
gifFavoriteSchema.index({ userId: 1, gifId: 1 }, { unique: true });

export const GifFavorite = mongoose.model<IGifFavorite>('GifFavorite', gifFavoriteSchema);
