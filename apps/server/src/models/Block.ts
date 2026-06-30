import mongoose, { Schema, Document } from 'mongoose';

export interface IBlock extends Document {
  blockerId: mongoose.Types.ObjectId;
  blockedId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BlockSchema = new Schema<IBlock>({
  blockerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blockedId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export const Block = mongoose.model<IBlock>('Block', BlockSchema);
