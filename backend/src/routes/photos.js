import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import PhotoController from '../controllers/PhotoController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { uploadPhoto, handleUploadError } from '../middleware/upload.js';
import { publicCache } from '../middleware/cache.js';

const router = Router();

// Upload firewall: 20 photos per hour per IP to limit storage abuse.
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Upload limit reached. You can upload up to 20 photos per hour.' },
});

router.get('/filmstock/:filmStockId', optionalAuth, publicCache(120), PhotoController.getByFilmStock);

router.post('/', uploadLimiter, authenticate, uploadPhoto, handleUploadError, [
  body('filmStockId').isInt({ min: 1 }).withMessage('Valid film stock ID required'),
  body('title').optional().trim().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('frameBackgroundColor').optional().matches(/^#[0-9a-fA-F]{6}$/),
  body('frameGapPx').optional().isInt({ min: 0, max: 80 }),
  body('frameBorderWidthPx').optional().isInt({ min: 0, max: 24 }),
  body('frameBorderColor').optional().matches(/^#[0-9a-fA-F]{6}$/),
  body('frameImagePosition').optional().isIn([
    'left top', 'center top', 'right top',
    'left center', 'center center', 'right center',
    'left bottom', 'center bottom', 'right bottom',
  ]),
  body('cameraMake').optional().trim().isLength({ max: 100 }),
  body('cameraModel').optional().trim().isLength({ max: 100 }),
  body('lensModel').optional().trim().isLength({ max: 100 }),
  body('focalLengthMm').optional().isInt({ min: 1, max: 2000 }).withMessage('Focal length must be 1–2000 mm'),
], PhotoController.upload);

router.delete('/:id', authenticate, PhotoController.remove);

router.post('/:id/like', authenticate, PhotoController.toggleLike);

router.get('/:id/comments', optionalAuth, PhotoController.getComments);
router.post('/:id/comments', authenticate, [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1–1000 characters'),
], PhotoController.addComment);

export default router;
