import { Router } from 'express';
import LabController from '../controllers/LabController.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', LabController.getAll);
router.post('/', authenticate, adminOnly, LabController.create);
router.delete('/:id', authenticate, adminOnly, LabController.remove);
router.post('/:id/reviews', authenticate, LabController.addReview);

export default router;
