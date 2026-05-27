import pool from '../config/database.js';

export default class BaseModel {
  static tableName = '';

  static async query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  static async findAll({ where = {}, orderBy = 'created_at DESC', limit, offset } = {}) {
    const conditions = Object.keys(where);
    const whereClause = conditions.length
      ? 'WHERE ' + conditions.map(k => `${k} = ?`).join(' AND ')
      : '';
    const limitClause  = limit  != null ? `LIMIT ${parseInt(limit)}`  : '';
    const offsetClause = offset != null ? `OFFSET ${parseInt(offset)}` : '';
    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY ${orderBy} ${limitClause} ${offsetClause}`;
    return this.query(sql, Object.values(where));
  }

  static async findById(id) {
    const rows = await this.query(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  static async findOne(where = {}) {
    const conditions = Object.keys(where);
    const whereClause = conditions.map(k => `${k} = ?`).join(' AND ');
    const rows = await this.query(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`,
      Object.values(where)
    );
    return rows[0] || null;
  }

  static async create(data) {
    const keys   = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.query(sql, values);
    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const keys   = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    await this.query(`UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`, [...values, id]);
    return this.findById(id);
  }

  static async delete(id) {
    await this.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  static async count(where = {}) {
    const conditions = Object.keys(where);
    const whereClause = conditions.length
      ? 'WHERE ' + conditions.map(k => `${k} = ?`).join(' AND ')
      : '';
    const rows = await this.query(
      `SELECT COUNT(*) AS total FROM ${this.tableName} ${whereClause}`,
      Object.values(where)
    );
    return rows[0].total;
  }
}
