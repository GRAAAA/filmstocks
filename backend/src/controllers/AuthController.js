import { validationResult } from 'express-validator';
import AuthService from '../services/AuthService.js';
import User from '../models/User.js';

export default class AuthController {
  static async register(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      const result = await AuthService.register(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  }

  static async login(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      const result = await AuthService.login(req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  }

  static async google(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      const result = await AuthService.googleLogin(req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  }

  static async me(req, res) {
    try {
      const user = await User.findById(req.user.id);
      res.json(User.safeFields(user));
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
}
