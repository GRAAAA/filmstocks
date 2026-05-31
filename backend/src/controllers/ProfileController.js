import Photo from '../models/Photo.js';
import ForumReply from '../models/ForumReply.js';

export default class ProfileController {
  static async getMe(req, res) {
    try {
      const [photos, replies] = await Promise.all([
        Photo.getByUser(req.user.id),
        ForumReply.getByUser(req.user.id),
      ]);

      res.json({
        user: req.user,
        stats: {
          photos: photos.length,
          replies: replies.length,
          likes: photos.reduce((total, photo) => total + Number(photo.likes_count || 0), 0),
        },
        photos,
        replies,
      });
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
