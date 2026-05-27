import { Router } from 'express';
import { body } from 'express-validator';
import PhotoController from '../controllers/PhotoController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { uploadPhoto, handleUploadError } from '../middleware/upload.js';
import { publicCache } from '../middleware/cache.js';

const router = Router();

router.get('/filmstock/:filmStockId', optionalAuth, publicCache(120), PhotoController.getByFilmStock);

router.post('/', authenticate, uploadPhoto, handleUploadError, [
  body('filmStockId').isInt({ min: 1 }).withMessage('Valid film stock ID required'),
  body('title').optional().trim().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
], PhotoController.upload);

router.delete('/:id', authenticate, PhotoController.remove);

router.post('/:id/like', authenticate, PhotoController.toggleLike);

export default router;
