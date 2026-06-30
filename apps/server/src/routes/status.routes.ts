import { Router } from 'express';
import { createStatus, getStatuses, markStatusViewed } from '../controllers/status.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', createStatus);
router.get('/', getStatuses);
router.post('/:statusId/view', markStatusViewed);

export default router;