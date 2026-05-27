import { Router } from 'express';
import AdminController from '../controllers/AdminController.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, adminOnly);

router.get('/users', AdminController.getUsers);
router.put('/users/:id/role', AdminController.updateRole);
router.delete('/users/:id', AdminController.deleteUser);

export default router;
