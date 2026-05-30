import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import AdminController from '../controllers/AdminController.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

// Stricter firewall on admin endpoints: 120 req / 15 min per IP.
// Brute-forcing the admin panel should be noticed and blocked quickly.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many admin requests, please slow down' },
});

router.use(adminLimiter, authenticate, adminOnly);

router.get('/storage', AdminController.getStorage);
router.get('/users', AdminController.getUsers);
router.put('/users/:id/role', AdminController.updateRole);
router.delete('/users/:id', AdminController.deleteUser);

export default router;
