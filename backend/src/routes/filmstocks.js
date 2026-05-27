import { Router } from 'express';
import { body } from 'express-validator';
import FilmStockController from '../controllers/FilmStockController.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import { uploadCover, handleUploadError } from '../middleware/upload.js';
import { publicCache } from '../middleware/cache.js';

const router = Router();

router.get('/',    publicCache(600), FilmStockController.getAll);
router.get('/:id', publicCache(300), FilmStockController.getOne);

router.post('/', authenticate, adminOnly, uploadCover, handleUploadError, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('brand').trim().notEmpty().withMessage('Brand is required'),
  body('type').isIn(['bw', 'color_negative', 'reversal']).withMessage('Invalid type'),
  body('iso').optional().isInt({ min: 1 }),
], FilmStockController.create);

router.put('/:id', authenticate, adminOnly, uploadCover, handleUploadError, [
  body('name').optional().trim().notEmpty(),
  body('brand').optional().trim().notEmpty(),
  body('type').optional().isIn(['bw', 'color_negative', 'reversal']),
  body('iso').optional().isInt({ min: 1 }),
], FilmStockController.update);

router.delete('/:id', authenticate, adminOnly, FilmStockController.remove);

export default router;
