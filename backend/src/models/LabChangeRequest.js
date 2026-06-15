import BaseModel from './BaseModel.js';

export default class LabChangeRequest extends BaseModel {
  static tableName = 'lab_change_requests';

  static async getPending() {
    return this.query(`
      SELECT r.*, u.username, l.name AS lab_name
      FROM lab_change_requests r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN labs l ON l.id = r.lab_id
      WHERE r.status = 'pending'
      ORDER BY r.created_at ASC
    `);
  }
}
