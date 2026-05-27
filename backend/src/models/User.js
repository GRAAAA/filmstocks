import BaseModel from './BaseModel.js';

export default class User extends BaseModel {
  static tableName = 'users';

  static async findByEmail(email) {
    return this.findOne({ email });
  }

  static async findByUsername(username) {
    return this.findOne({ username });
  }

  static async findByGoogleId(googleId) {
    return this.findOne({ google_id: googleId });
  }

  static safeFields(user) {
    if (!user) return null;
    const { password_hash, ...safe } = user;
    return safe;
  }

  static async getAll() {
    return this.query(
      'SELECT id, username, email, auth_provider, role, avatar_url, created_at FROM users ORDER BY created_at DESC'
    );
  }
}
