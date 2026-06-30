import { Response } from 'express';
import { Status } from '../models/Status';
import { Contact } from '../models/Contact';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';

export const createStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { type, content, media, backgroundColor } = req.body;
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    const newStatus = await Status.create({
      user: req.user?.id,
      type,
      content,
      media,
      backgroundColor,
      expiresAt,
    });

    // Notify contacts via socket
    try {
      const followers = await Contact.find({ contactUser: req.user?.id });
      const io = req.app.get('io');
      if (io) {
        followers.forEach(follower => {
          io.to(follower.user.toString()).emit('status_updated', { userId: req.user?.id });
        });
        // also notify user themselves
        io.to(req.user?.id).emit('status_updated', { userId: req.user?.id });
      }
    } catch (socketErr) {
      console.error('Error broadcasting status update:', socketErr);
    }

    res.status(201).json({ success: true, data: newStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create status' });
  }
};

export const getStatuses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string;

    // Get block lists
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const blockedByMe = user.blockedUsers.map(id => id.toString());

    const usersWhoBlockedMe = await User.find({ blockedUsers: userId });
    const blockedByOthers = usersWhoBlockedMe.map(u => u._id.toString());
    const forbiddenUsers = new Set([...blockedByMe, ...blockedByOthers]);

    // Get contacts to only fetch their statuses
    const contacts = await Contact.find({ user: userId });
    const allowedUserIds = contacts
      .map(c => c.contactUser.toString())
      .filter(id => !forbiddenUsers.has(id));
    allowedUserIds.push(userId); // Include own statuses

    const activeStatuses = await Status.find({
      user: { $in: allowedUserIds },
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'fullName username profilePhoto')
    .sort({ createdAt: 1 });

    // Group statuses by user
    const groupedMap = new Map<string, any>();

    activeStatuses.forEach(status => {
      const sUser = status.user as any;
      if (!sUser) return;
      const uId = sUser._id.toString();

      if (!groupedMap.has(uId)) {
        groupedMap.set(uId, {
          user: { id: uId, displayName: sUser.displayName, avatarUrl: sUser.avatarUrl },
          statuses: [],
          isAllViewed: true,
        });
      }

      const group = groupedMap.get(uId);
      const isViewed = status.viewers.some(vId => vId.toString() === userId);
      
      if (!isViewed) group.isAllViewed = false;

      group.statuses.push({
        id: status._id,
        type: status.type,
        content: status.content,
        media: status.media,
        backgroundColor: status.backgroundColor,
        viewers: status.viewers.map(v => v.toString()),
        createdAt: status.createdAt,
        expiresAt: status.expiresAt,
      });
    });

    // Ensure own status is first, then unviewed, then viewed
    const allGroups = Array.from(groupedMap.values());
    const myGroup = allGroups.find(g => g.user.id === userId);
    const otherGroups = allGroups.filter(g => g.user.id !== userId);
    
    otherGroups.sort((a, b) => {
      if (a.isAllViewed === b.isAllViewed) {
        // Sort by latest status if both have same viewed state
        const aLatest = new Date(a.statuses[a.statuses.length - 1].createdAt).getTime();
        const bLatest = new Date(b.statuses[b.statuses.length - 1].createdAt).getTime();
        return bLatest - aLatest;
      }
      return a.isAllViewed ? 1 : -1;
    });

    const result = myGroup ? [myGroup, ...otherGroups] : otherGroups;

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch statuses' });
  }
};

export const markStatusViewed = async (req: AuthRequest, res: Response) => {
  try {
    const { statusId } = req.params;
    
    await Status.findByIdAndUpdate(
      statusId,
      { $addToSet: { viewers: req.user?.id } }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark status as viewed' });
  }
};