import { Router } from 'express';
import { uploadMedia, getMedia, downloadMedia } from '../controllers/media.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(requireAuth);

// Single file upload via 'file' field
router.post('/upload', upload.single('file'), uploadMedia);

// Secure retrieval and download
router.get('/:mediaId', getMedia);
router.get('/download/:mediaId', downloadMedia);

export default router;