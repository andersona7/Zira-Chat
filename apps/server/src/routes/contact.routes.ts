import { Router } from 'express';
import { 
  getContacts, 
  addContact, 
  updateContact, 
  deleteContact, 
  sendLockResetOtp, 
  verifyLockResetOtp, 
  verifyPasswordForLockReset, 
  resetLockPin 
} from '../controllers/contact.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { addContactSchema, updateContactSchema } from '../schemas/contact.schema';

const router = Router();

router.use(requireAuth);

router.get('/', getContacts);
router.post('/', validate(addContactSchema), addContact);
router.patch('/:id', validate(updateContactSchema), updateContact);
router.delete('/:id', deleteContact);

// PIN Recovery Routes
router.post('/lock-reset/send-otp', sendLockResetOtp);
router.post('/lock-reset/verify-otp', verifyLockResetOtp);
router.post('/lock-reset/verify-password', verifyPasswordForLockReset);
router.post('/lock-reset/reset', resetLockPin);

export default router;