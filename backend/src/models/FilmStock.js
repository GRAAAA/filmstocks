import BaseModel from './BaseModel.js';

export default class FilmStock extends BaseModel {
  static tableName = 'film_stocks';

  static async getWithPhotoCounts() {
    return this.query(`
      SELECT fs.*,
             COUNT(DISTINCT p.id)  AS photo_count,
             COUNT(DISTINCT fp.id) AS post_count
      FROM film_stocks fs
      LEFT JOIN photos p      ON p.film_stock_id = fs.id
      LEFT JOIN forum_posts fp ON fp.film_stock_id = fs.id
      GROUP BY fs.id
      ORDER BY fs.type, fs.brand, fs.name
    `);
  }

  static async getByType(type) {
    return this.query(`
      SELECT fs.*,
             COUNT(DISTINCT p.id)  AS photo_count,
             COUNT(DISTINCT fp.id) AS post_count
      FROM film_stocks fs
      LEFT JOIN photos p      ON p.film_stock_id = fs.id
      LEFT JOIN forum_posts fp ON fp.film_stock_id = fs.id
      WHERE fs.type = ?
      GROUP BY fs.id
      ORDER BY fs.brand, fs.name
    `, [type]);
  }

  static async getOneWithCounts(id) {
    const rows = await this.query(`
      SELECT fs.*,
             COUNT(DISTINCT p.id)  AS photo_count,
             COUNT(DISTINCT fp.id) AS post_count
      FROM film_stocks fs
      LEFT JOIN photos p      ON p.film_stock_id = fs.id
      LEFT JOIN forum_posts fp ON fp.film_stock_id = fs.id
      WHERE fs.id = ?
      GROUP BY fs.id
    `, [id]);
    return rows[0] || null;
  }
}
