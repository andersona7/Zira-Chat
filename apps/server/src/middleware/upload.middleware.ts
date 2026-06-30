import multer from 'multer';

// Use memory storage to avoid disk I/O bottlenecks in production.
// Files will be piped directly to Cloudinary.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for general uploads
  },
});