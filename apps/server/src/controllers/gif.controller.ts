import { Request, Response } from 'express';
import { GifFavorite } from '../models/GifFavorite';
import { GifRecent } from '../models/GifRecent';
import { AuthRequest } from '../middleware/auth.middleware';

// Get user's favorites
export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const favorites = await GifFavorite.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: favorites.map(f => f.gifId) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Add to favorites
export const addFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { gifId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!gifId) return res.status(400).json({ success: false, error: 'GIF ID is required' });

    await GifFavorite.findOneAndUpdate(
      { userId, gifId },
      { userId, gifId },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Added to favorites' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Remove from favorites
export const removeFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { gifId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!gifId) return res.status(400).json({ success: false, error: 'GIF ID is required' });

    await GifFavorite.deleteOne({ userId, gifId });
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get recently used
export const getRecent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const recent = await GifRecent.find({ userId }).sort({ usedAt: -1 }).limit(30);
    res.json({ success: true, data: recent.map(r => r.gifId) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Record usage
export const recordUsage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { gifId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!gifId) return res.status(400).json({ success: false, error: 'GIF ID is required' });

    // Upsert recent usage
    await GifRecent.findOneAndUpdate(
      { userId, gifId },
      { usedAt: new Date() },
      { upsert: true }
    );

    // Limit to latest 30
    const recentsCount = await GifRecent.countDocuments({ userId });
    if (recentsCount > 30) {
      const itemsToKeep = await GifRecent.find({ userId })
        .sort({ usedAt: -1 })
        .limit(30)
        .select('_id');
      const keepIds = itemsToKeep.map(item => item._id);
      await GifRecent.deleteMany({ userId, _id: { $nin: keepIds } });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
