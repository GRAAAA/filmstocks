import User from '../models/User.js';
import Photo from '../models/Photo.js';

export default class AdminController {
  static async getStorage(req, res) {
    try {
      const stats = await Photo.getStorageStats();
      const storageLimitBytes = parseInt(process.env.STORAGE_BUDGET_BYTES || '10737418240', 10);
      const storageSizeBytes = Number(stats.storage_size_bytes || 0);
      const originalSizeBytes = Number(stats.original_size_bytes || 0);
      const optimizedSizeBytes = Number(stats.optimized_size_bytes || 0);
      const storageSavedBytes = Number(stats.storage_saved_bytes || 0);

      const killSwitchPercent = 95;
      const softLimitBytes = Math.floor(storageLimitBytes * (killSwitchPercent / 100));
      const storageUsedPercent = storageLimitBytes > 0
        ? Math.min((storageSizeBytes / storageLimitBytes) * 100, 100)
        : 0;
      const uploadBlocked = storageSizeBytes >= softLimitBytes;

      res.json({
        photo_count: Number(stats.photo_count || 0),
        variant_count: Number(stats.variant_count || 0),
        unique_hash_count: Number(stats.unique_hash_count || 0),
        original_size_bytes: originalSizeBytes,
        optimized_size_bytes: optimizedSizeBytes,
        storage_size_bytes: storageSizeBytes,
        storage_saved_bytes: storageSavedBytes,
        storage_limit_bytes: storageLimitBytes,
        storage_remaining_bytes: Math.max(softLimitBytes - storageSizeBytes, 0),
        storage_used_percent: storageUsedPercent,
        storage_kill_switch_percent: killSwitchPercent,
        upload_blocked: uploadBlocked,
        uploads_enabled: !uploadBlocked,
        max_upload_bytes: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
        compression_ratio: originalSizeBytes > 0
          ? optimizedSizeBytes / originalSizeBytes
          : 0,
      });
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getUsers(req, res) {
    try {
      const users = await User.getAll();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
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
      res.status(500).json({ message: 'Internal server error' });
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
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
