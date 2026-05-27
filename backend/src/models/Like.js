import BaseModel from './BaseModel.js';

export default class Like extends BaseModel {
  static tableName = 'photo_likes';

  static async toggle(photoId, userId) {
    const existing = await this.findOne({ photo_id: photoId, user_id: userId });

    if (existing) {
      await this.query('DELETE FROM photo_likes WHERE photo_id = ? AND user_id = ?', [photoId, userId]);
      await this.query('UPDATE photos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [photoId]);
      return { liked: false };
    } else {
      await this.query('INSERT INTO photo_likes (photo_id, user_id) VALUES (?, ?)', [photoId, userId]);
      await this.query('UPDATE photos SET likes_count = likes_count + 1 WHERE id = ?', [photoId]);
      return { liked: true };
    }
  }
}
