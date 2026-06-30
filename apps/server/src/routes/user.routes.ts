import { Router } from 'express';
import { getMe, updateProfile, searchUsers, blockUser, unblockUser, requestDeleteAccount, confirmDeleteAccount } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const deleteRequestLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit to 3 requests per IP
  message: 'Too many account deletion requests from this IP. Please try again after 15 minutes.'
});

// Public endpoint for confirming account deletion from email link
router.post('/confirm-delete', deleteRequestLimiter, confirmDeleteAccount);

// Protected routes
router.use(requireAuth);

router.get('/me', getMe);
router.patch('/me', updateProfile);
router.post('/me/delete-request', deleteRequestLimiter, requestDeleteAccount);
router.get('/search', searchUsers);
router.post('/block/:targetId', blockUser);
router.post('/unblock/:targetId', unblockUser);

export default router;