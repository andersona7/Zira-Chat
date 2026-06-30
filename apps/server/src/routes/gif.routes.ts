import { Router } from 'express';
import { getFavorites, addFavorite, removeFavorite, getRecent, recordUsage } from '../controllers/gif.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/favorites', getFavorites);
router.post('/favorites/:gifId', addFavorite);
router.delete('/favorites/:gifId', removeFavorite);

router.get('/recent', getRecent);
router.post('/recent/:gifId', recordUsage);

export default router;
