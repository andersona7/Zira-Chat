import { Router } from 'express';
import { 
   getChats, 
   createDirectChat, 
   createGroupChat, 
   getMessages, 
   toggleMuteChat,
   updateGroupMetadata,
   addParticipants,
   removeParticipant,
   toggleAdmin,
   deleteGroup,
   clearChat,
   getSharedMedia,
   setupLockPin,
   verifyLockerPin,
   changeLockPin,
   requestLockPinResetCode,
   verifyLockResetOtp,
   verifyPasswordForLockReset,
   resetLockPin,
   lockChat,
   unlockChat,
   getMessageInfo
} from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getChats);
router.post('/direct', createDirectChat);
router.post('/group', createGroupChat);
router.post('/lock-settings/setup', setupLockPin);
router.post('/lock-settings/verify', verifyLockerPin);
router.post('/lock-settings/change', changeLockPin);
router.post('/lock-settings/reset-request', requestLockPinResetCode);
router.post('/lock-settings/verify-otp', verifyLockResetOtp);
router.post('/lock-settings/verify-password', verifyPasswordForLockReset);
router.post('/lock-settings/reset-confirm', resetLockPin);
router.get('/:chatId/messages', getMessages);
router.get('/:chatId/messages/:messageId/info', getMessageInfo);
router.post('/:chatId/mute', toggleMuteChat);
router.post('/:chatId/clear', clearChat);
router.post('/:chatId/lock', lockChat);
router.post('/:chatId/unlock', unlockChat);
router.get('/:chatId/shared-media', getSharedMedia);
router.patch('/:chatId/group', updateGroupMetadata);
router.post('/:chatId/participants', addParticipants);
router.delete('/:chatId/participants/:userId', removeParticipant);
router.patch('/:chatId/admins', toggleAdmin);
router.delete('/:chatId', deleteGroup);

export default router;