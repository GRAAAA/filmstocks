import { Router } from 'express';
import ProfileController from '../controllers/ProfileController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/me', authenticate, ProfileController.getMe);

export default router;
