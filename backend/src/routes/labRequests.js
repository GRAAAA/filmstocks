import { Router } from 'express';
import LabController from '../controllers/LabController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, LabController.createRequest);

export default router;
