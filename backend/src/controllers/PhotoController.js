import { validationResult } from 'express-validator';
import Photo from '../models/Photo.js';
import Like from '../models/Like.js';
import FilmStock from '../models/FilmStock.js';
import ImageStorageService from '../services/ImageStorageService.js';

export default class PhotoController {
  static async getByFilmStock(req, res) {
    try {
      const userId = req.user?.id || null;
      const page = Math.max(parseInt(req.query.page || '1'), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || '24'), 1), 60);
      const offset = (page - 1) * limit;
      const [photos, total] = await Promise.all([
        Photo.getByFilmStock(req.params.filmStockId, userId, { limit, offset }),
        Photo.countByFilmStock(req.params.filmStockId),
      ]);
      res.json({
        data: photos,
        pagination: {
          page,
          limit,
          total,
          hasMore: offset + photos.length < total,
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async upload(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    if (!req.file) return res.status(400).json({ message: 'Image file is required' });

    try {
      const {
        filmStockId,
        title,
        description,
        frameBackgroundColor,
        frameGapPx,
        frameBorderWidthPx,
        frameBorderColor,
        frameImagePosition,
        cameraMake,
        cameraModel,
        lensModel,
        focalLengthMm,
      } = req.body;
      const stock = await FilmStock.findById(filmStockId);
      if (!stock) return res.status(404).json({ message: 'Film stock not found' });

      const storedImage = await ImageStorageService.storePhoto(req.file);
      const photo = await Photo.create({
        film_stock_id: filmStockId,
        user_id:       req.user.id,
        title:         title || null,
        description:   description || null,
        frame_background_color: frameBackgroundColor || null,
        frame_gap_px: Number(frameGapPx || 0),
        frame_border_width_px: Number(frameBorderWidthPx || 0),
        frame_border_color: frameBorderColor || null,
        frame_image_position: frameImagePosition || 'center center',
        camera_make:     cameraMake || null,
        camera_model:    cameraModel || null,
        lens_model:      lensModel || null,
        focal_length_mm: focalLengthMm ? Number(focalLengthMm) : null,
        ...storedImage,
      });
      res.status(201).json(photo);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async remove(req, res) {
    try {
      const photo = await Photo.findById(req.params.id);
      if (!photo) return res.status(404).json({ message: 'Photo not found' });

      const canDelete = req.user.role === 'admin' || photo.user_id === req.user.id;
      if (!canDelete) return res.status(403).json({ message: 'Forbidden' });

      await Photo.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async toggleLike(req, res) {
    try {
      const photo = await Photo.findById(req.params.id);
      if (!photo) return res.status(404).json({ message: 'Photo not found' });

      const result = await Like.toggle(req.params.id, req.user.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
}
