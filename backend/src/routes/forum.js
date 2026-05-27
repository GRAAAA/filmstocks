import { Router } from 'express';
import { body } from 'express-validator';
import ForumController from '../controllers/ForumController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/filmstock/:filmStockId/posts', ForumController.getPosts);

router.post('/posts', authenticate, [
  body('filmStockId').isInt({ min: 1 }).withMessage('Valid film stock ID required'),
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 characters'),
  body('content').trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
], ForumController.createPost);

router.get('/posts/:id', ForumController.getPost);

router.put('/posts/:id', authenticate, [
  body('title').optional().trim().isLength({ min: 3, max: 200 }),
  body('content').optional().trim().isLength({ min: 10 }),
], ForumController.updatePost);

router.delete('/posts/:id', authenticate, ForumController.deletePost);

router.post('/posts/:id/replies', authenticate, [
  body('content').trim().isLength({ min: 1 }).withMessage('Reply content is required'),
  body('parentReplyId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Valid parent reply ID required'),
], ForumController.createReply);

router.put('/replies/:id', authenticate, [
  body('content').trim().isLength({ min: 1 }).withMessage('Content is required'),
], ForumController.updateReply);

router.delete('/replies/:id', authenticate, ForumController.deleteReply);

export default router;
