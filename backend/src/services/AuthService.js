import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export default class AuthService {
  static #SALT_ROUNDS = 12;

  static async register({ username, email, password }) {
    const [existingEmail, existingUsername] = await Promise.all([
      User.findByEmail(email),
      User.findByUsername(username),
    ]);
    if (existingEmail)    throw Object.assign(new Error('Email already in use'), { status: 409 });
    if (existingUsername) throw Object.assign(new Error('Username already taken'), { status: 409 });

    const password_hash = await bcrypt.hash(password, this.#SALT_ROUNDS);
    const user = await User.create({ username, email, password_hash });
    return { user: User.safeFields(user), token: this.#sign(user) };
  }

  static async login({ email, password }) {
    const user = await User.findByEmail(email);
    if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    return { user: User.safeFields(user), token: this.#sign(user) };
  }

  static #sign(user) {
    return jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  static verify(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}
