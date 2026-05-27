import BaseModel from './BaseModel.js';

export default class ForumReply extends BaseModel {
  static tableName = 'forum_replies';

  static async createAndIncrementCount(postId, userId, content, parentReplyId = null) {
    const result = await this.query(
      'INSERT INTO forum_replies (post_id, parent_reply_id, user_id, content) VALUES (?, ?, ?, ?)',
      [postId, parentReplyId, userId, content]
    );
    await this.query(
      'UPDATE forum_posts SET reply_count = reply_count + 1 WHERE id = ?',
      [postId]
    );
    const rows = await this.query(`
      SELECT fr.*, u.username, u.avatar_url
      FROM forum_replies fr
      JOIN users u ON u.id = fr.user_id
      WHERE fr.id = ?
      LIMIT 1
    `, [result.insertId]);
    return rows[0];
  }

  static async deleteAndDecrementCount(replyId, postId) {
    const rows = await this.query(`
      WITH RECURSIVE reply_tree AS (
        SELECT id FROM forum_replies WHERE id = ?
        UNION ALL
        SELECT fr.id
        FROM forum_replies fr
        JOIN reply_tree rt ON fr.parent_reply_id = rt.id
      )
      SELECT COUNT(*) AS total FROM reply_tree
    `, [replyId]);

    await this.query('DELETE FROM forum_replies WHERE id = ?', [replyId]);
    await this.query(
      'UPDATE forum_posts SET reply_count = GREATEST(reply_count - ?, 0) WHERE id = ?',
      [rows[0]?.total || 1, postId]
    );
  }

  static async getByUser(userId) {
    return this.query(`
      SELECT fr.*,
             fp.title AS post_title,
             fp.film_stock_id,
             fs.name AS film_stock_name,
             parent.content AS parent_content,
             parent_user.username AS parent_username
      FROM forum_replies fr
      JOIN forum_posts fp ON fp.id = fr.post_id
      JOIN film_stocks fs ON fs.id = fp.film_stock_id
      LEFT JOIN forum_replies parent ON parent.id = fr.parent_reply_id
      LEFT JOIN users parent_user ON parent_user.id = parent.user_id
      WHERE fr.user_id = ?
      ORDER BY fr.created_at DESC
    `, [userId]);
  }
}
