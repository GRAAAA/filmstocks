import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

export default class AuthService {
  static #SALT_ROUNDS = 12;
  static #googleClient = new OAuth2Client();

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
    if (!user.password_hash) {
      throw Object.assign(new Error('Use Google sign-in for this account'), { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    return { user: User.safeFields(user), token: this.#sign(user) };
  }

  static async googleLogin({ credential }) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw Object.assign(new Error('Google sign-in is not configured'), { status: 503 });
    }

    const ticket = await this.#googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      throw Object.assign(new Error('Google account email is not verified'), { status: 401 });
    }

    let user = await User.findByGoogleId(payload.sub);

    if (!user) {
      const existing = await User.findByEmail(payload.email);
      if (existing) {
        user = await User.update(existing.id, {
          google_id: payload.sub,
          avatar_url: existing.avatar_url || payload.picture || null,
        });
      } else {
        user = await User.create({
          username: await this.#uniqueUsername(payload.name || payload.email.split('@')[0]),
          email: payload.email,
          password_hash: null,
          google_id: payload.sub,
          auth_provider: 'google',
          avatar_url: payload.picture || null,
        });
      }
    }

    return { user: User.safeFields(user), token: this.#sign(user) };
  }

  static async #uniqueUsername(seed) {
    const base = seed
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 42) || 'filmuser';

    let candidate = base;
    let suffix = 1;
    while (await User.findByUsername(candidate)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    return candidate;
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
