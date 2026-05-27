import BaseModel from './BaseModel.js';

export default class ForumPost extends BaseModel {
  static tableName = 'forum_posts';

  static async getByFilmStock(filmStockId) {
    return this.query(`
      SELECT fp.*,
             u.username,
             u.avatar_url
      FROM forum_posts fp
      JOIN users u ON u.id = fp.user_id
      WHERE fp.film_stock_id = ?
      ORDER BY fp.created_at DESC
    `, [filmStockId]);
  }

  static async getWithReplies(postId) {
    const [postRows, replies] = await Promise.all([
      this.query(`
        SELECT fp.*,
               u.username,
               u.avatar_url,
               fs.name AS film_stock_name,
               fs.type AS film_stock_type
        FROM forum_posts fp
        JOIN users u       ON u.id  = fp.user_id
        JOIN film_stocks fs ON fs.id = fp.film_stock_id
        WHERE fp.id = ?
      `, [postId]),
      this.query(`
        SELECT fr.*,
               u.username,
               u.avatar_url
        FROM forum_replies fr
        JOIN users u ON u.id = fr.user_id
        WHERE fr.post_id = ?
        ORDER BY fr.created_at ASC
      `, [postId]),
    ]);
    if (!postRows[0]) return null;
    return { ...postRows[0], replies };
  }
}
