import { Response } from 'express';
import { Call } from '../models/Call';
import { AuthRequest } from '../middleware/auth.middleware';

export const getCalls = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    // Retrieve calls where the user was either the caller or receiver
    const calls = await Call.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .populate('caller', 'username fullName profilePhoto')
      .populate('receiver', 'username fullName profilePhoto')
      .sort({ createdAt: -1 })
      .limit(50);

    const formattedCalls = calls.map(c => {
      const isCaller = c.caller._id.toString() === userId;
      const otherUser = isCaller ? c.receiver : c.caller;

      return {
        id: c._id,
        type: c.type,
        status: c.status,
        duration: c.duration,
        createdAt: c.createdAt,
        isOutgoing: isCaller,
        contactUser: {
          id: (otherUser as any)._id,
          username: (otherUser as any).username,
          displayName: (otherUser as any).fullName || (otherUser as any).username,
          avatarUrl: (otherUser as any).profilePhoto,
        },
      };
    });

    res.status(200).json({ success: true, data: formattedCalls });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve call history' });
  }
};

export const deleteCall = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const call = await Call.findById(id);
    if (!call) return res.status(404).json({ success: false, error: 'Call log not found' });

    // Verify ownership
    if (call.caller.toString() !== userId && call.receiver.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await Call.findByIdAndDelete(id);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete call log' });
  }
};

export const clearCalls = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    await Call.deleteMany({
      $or: [{ caller: userId }, { receiver: userId }],
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to clear call history' });
  }
};
