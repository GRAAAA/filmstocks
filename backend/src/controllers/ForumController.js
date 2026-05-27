import { validationResult } from 'express-validator';
import ForumPost from '../models/ForumPost.js';
import ForumReply from '../models/ForumReply.js';
import FilmStock from '../models/FilmStock.js';

export default class ForumController {
  static async getPosts(req, res) {
    try {
      const posts = await ForumPost.getByFilmStock(req.params.filmStockId);
      res.json(posts);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async getPost(req, res) {
    try {
      const post = await ForumPost.getWithReplies(req.params.id);
      if (!post) return res.status(404).json({ message: 'Post not found' });
      res.json(post);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async createPost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      const { filmStockId, title, content } = req.body;
      const stock = await FilmStock.findById(filmStockId);
      if (!stock) return res.status(404).json({ message: 'Film stock not found' });

      const post = await ForumPost.create({
        film_stock_id: filmStockId,
        user_id:       req.user.id,
        title,
        content,
      });
      res.status(201).json(post);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async updatePost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      const post = await ForumPost.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const canEdit = req.user.role === 'admin' || post.user_id === req.user.id;
      if (!canEdit) return res.status(403).json({ message: 'Forbidden' });

      const data = {};
      if (req.body.title)   data.title   = req.body.title;
      if (req.body.content) data.content = req.body.content;
      const updated = await ForumPost.update(req.params.id, data);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async deletePost(req, res) {
    try {
      const post = await ForumPost.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const canDelete = req.user.role === 'admin' || post.user_id === req.user.id;
      if (!canDelete) return res.status(403).json({ message: 'Forbidden' });

      await ForumPost.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async createReply(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      const post = await ForumPost.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const parentReplyId = req.body.parentReplyId || null;
      if (parentReplyId) {
        const parent = await ForumReply.findById(parentReplyId);
        if (!parent || parent.post_id !== Number(req.params.id)) {
          return res.status(404).json({ message: 'Parent reply not found' });
        }
      }

      const reply = await ForumReply.createAndIncrementCount(
        req.params.id, req.user.id, req.body.content, parentReplyId
      );
      res.status(201).json(reply);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async updateReply(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      const reply = await ForumReply.findById(req.params.id);
      if (!reply) return res.status(404).json({ message: 'Reply not found' });

      const canEdit = req.user.role === 'admin' || reply.user_id === req.user.id;
      if (!canEdit) return res.status(403).json({ message: 'Forbidden' });

      const updated = await ForumReply.update(req.params.id, { content: req.body.content });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async deleteReply(req, res) {
    try {
      const reply = await ForumReply.findById(req.params.id);
      if (!reply) return res.status(404).json({ message: 'Reply not found' });

      const canDelete = req.user.role === 'admin' || reply.user_id === req.user.id;
      if (!canDelete) return res.status(403).json({ message: 'Forbidden' });

      await ForumReply.deleteAndDecrementCount(req.params.id, reply.post_id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
}
