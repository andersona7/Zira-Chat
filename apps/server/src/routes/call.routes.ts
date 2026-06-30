import { Router } from 'express';
import { getCalls, deleteCall, clearCalls } from '../controllers/call.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getCalls);
router.delete('/:id', deleteCall);
router.delete('/', clearCalls);

export default router;
