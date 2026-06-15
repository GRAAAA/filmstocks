import BaseModel from './BaseModel.js';

export default class Lab extends BaseModel {
  static tableName = 'labs';

  static async getAll() {
    return this.query(`
      SELECT l.*,
             COALESCE(AVG(lr.rating), 0) AS average_rating,
             COUNT(lr.id)                AS review_count
      FROM labs l
      LEFT JOIN lab_reviews lr ON lr.lab_id = l.id
      GROUP BY l.id
      ORDER BY l.name ASC
    `);
  }

  static async addReview(labId, userId, rating, comment) {
    await this.query(
      `INSERT INTO lab_reviews (lab_id, user_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = CURRENT_TIMESTAMP`,
      [labId, userId, rating, comment]
    );
  }
}
