import mongoose, { Schema, Document } from 'mongoose';

export interface ICall extends Document {
  caller: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  type: 'AUDIO' | 'VIDEO';
  status: 'CONNECTED' | 'MISSED' | 'REJECTED';
  duration: number; // in seconds
  deletedFor: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const callSchema = new Schema<ICall>(
  {
    caller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['AUDIO', 'VIDEO'], required: true },
    status: { type: String, enum: ['CONNECTED', 'MISSED', 'REJECTED'], required: true },
    duration: { type: Number, default: 0 },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });

export const Call = mongoose.model<ICall>('Call', callSchema);
