import User from '../models/User.js';

export default class AdminController {
  static async getUsers(req, res) {
    try {
      const users = await User.getAll();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async updateRole(req, res) {
    try {
      const { role } = req.body;
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Role must be user or admin' });
      }
      if (parseInt(req.params.id) === req.user.id) {
        return res.status(400).json({ message: 'Cannot change your own role' });
      }
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      await User.update(req.params.id, { role });
      res.json({ message: 'Role updated' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async deleteUser(req, res) {
    try {
      if (parseInt(req.params.id) === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      await User.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
}
