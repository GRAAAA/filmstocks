import { validationResult } from 'express-validator';
import FilmStock from '../models/FilmStock.js';

export default class FilmStockController {
  static async getAll(req, res) {
    try {
      const stocks = await FilmStock.getWithPhotoCounts();
      res.json(stocks);
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getOne(req, res) {
    try {
      const stock = await FilmStock.getOneWithCounts(req.params.id);
      if (!stock) return res.status(404).json({ message: 'Film stock not found' });
      res.json(stock);
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      const data = {
        name:            req.body.name,
        brand:           req.body.brand,
        type:            req.body.type,
        iso:             req.body.iso || null,
        description:     req.body.description || null,
        characteristics: req.body.characteristics || null,
      };
      if (req.file) data.cover_image_url = `/uploads/covers/${req.file.filename}`;
      const stock = await FilmStock.create(data);
      res.status(201).json(stock);
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      const existing = await FilmStock.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Film stock not found' });

      const data = {};
      ['name', 'brand', 'type', 'iso', 'description', 'characteristics'].forEach(k => {
        if (req.body[k] !== undefined) data[k] = req.body[k];
      });
      if (req.file) data.cover_image_url = `/uploads/covers/${req.file.filename}`;

      const updated = await FilmStock.update(req.params.id, data);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async remove(req, res) {
    try {
      const existing = await FilmStock.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Film stock not found' });
      await FilmStock.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
