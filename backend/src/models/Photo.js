import BaseModel from './BaseModel.js';

export default class Photo extends BaseModel {
  static tableName = 'photos';

  static async getByFilmStock(filmStockId, userId = null, { limit = 24, offset = 0 } = {}) {
    return this.query(`
      SELECT p.*,
             u.username,
             u.avatar_url,
             ${userId ? 'IF(pl.id IS NOT NULL, 1, 0)' : '0'} AS liked_by_me
      FROM photos p
      JOIN users u ON u.id = p.user_id
      ${userId
        ? `LEFT JOIN photo_likes pl ON pl.photo_id = p.id AND pl.user_id = ${parseInt(userId)}`
        : ''}
      WHERE p.film_stock_id = ?
      ORDER BY p.created_at DESC
      LIMIT ${parseInt(limit)}
      OFFSET ${parseInt(offset)}
    `, [filmStockId]);
  }

  static async countByFilmStock(filmStockId) {
    return this.count({ film_stock_id: filmStockId });
  }

  static async getWithUser(id, userId = null) {
    const rows = await this.query(`
      SELECT p.*,
             u.username,
             u.avatar_url,
             fs.name AS film_stock_name,
             ${userId ? 'IF(pl.id IS NOT NULL, 1, 0)' : '0'} AS liked_by_me
      FROM photos p
      JOIN users u       ON u.id  = p.user_id
      JOIN film_stocks fs ON fs.id = p.film_stock_id
      ${userId
        ? `LEFT JOIN photo_likes pl ON pl.photo_id = p.id AND pl.user_id = ${parseInt(userId)}`
        : ''}
      WHERE p.id = ?
    `, [id]);
    return rows[0] || null;
  }

  static async getByUser(userId) {
    return this.query(`
      SELECT p.*,
             u.username,
             u.avatar_url,
             fs.name AS film_stock_name,
             fs.type AS film_stock_type,
             IF(pl.id IS NOT NULL, 1, 0) AS liked_by_me
      FROM photos p
      JOIN users u ON u.id = p.user_id
      JOIN film_stocks fs ON fs.id = p.film_stock_id
      LEFT JOIN photo_likes pl ON pl.photo_id = p.id AND pl.user_id = ?
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `, [userId, userId]);
  }
}
