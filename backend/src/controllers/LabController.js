import Lab from '../models/Lab.js';
import LabChangeRequest from '../models/LabChangeRequest.js';

export default class LabController {
  static async getAll(req, res) {
    try {
      res.json(await Lab.getAll());
    } catch {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async create(req, res) {
    try {
      const { name, city, country, latitude, longitude, opening_hours, date_opened, operational_status, website_url } = req.body;
      if (!name) return res.status(400).json({ message: 'Name is required' });
      const lab = await Lab.create({
        name,
        city: city || null,
        country: country || null,
        latitude: latitude || null,
        longitude: longitude || null,
        opening_hours: opening_hours || null,
        date_opened: date_opened || null,
        operational_status: operational_status || 'unknown',
        website_url: website_url || null,
        created_by: req.user.id,
      });
      res.status(201).json(lab);
    } catch {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async remove(req, res) {
    try {
      const lab = await Lab.findById(req.params.id);
      if (!lab) return res.status(404).json({ message: 'Lab not found' });
      await Lab.delete(req.params.id);
      res.status(204).send();
    } catch {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async addReview(req, res) {
    try {
      const { rating, comment } = req.body;
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1–5' });
      const lab = await Lab.findById(req.params.id);
      if (!lab) return res.status(404).json({ message: 'Lab not found' });
      await Lab.addReview(req.params.id, req.user.id, rating, comment || null);
      res.json({ message: 'Review saved' });
    } catch {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createRequest(req, res) {
    try {
      const { request_type, lab_id, name, city, country, latitude, longitude, opening_hours, date_opened, operational_status, website_url, note } = req.body;
      if (!['add', 'update', 'delete'].includes(request_type)) {
        return res.status(400).json({ message: 'Invalid request type' });
      }
      const record = await LabChangeRequest.create({
        user_id: req.user.id,
        lab_id: lab_id || null,
        request_type,
        name: name || null,
        city: city || null,
        country: country || null,
        latitude: latitude || null,
        longitude: longitude || null,
        opening_hours: opening_hours || null,
        date_opened: date_opened || null,
        operational_status: operational_status || null,
        website_url: website_url || null,
        note: note || null,
      });
      res.status(201).json(record);
    } catch {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getPendingRequests(req, res) {
    try {
      res.json(await LabChangeRequest.getPending());
    } catch {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async resolveRequest(req, res) {
    try {
      const { action } = req.params;
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Action must be approve or reject' });
      }
      const request = await LabChangeRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: 'Request not found' });

      if (action === 'approve' && request.request_type === 'add') {
        await Lab.create({
          name: request.name,
          city: request.city,
          country: request.country,
          latitude: request.latitude,
          longitude: request.longitude,
          opening_hours: request.opening_hours,
          date_opened: request.date_opened,
          operational_status: request.operational_status || 'unknown',
          website_url: request.website_url,
          created_by: req.user.id,
        });
      } else if (action === 'approve' && request.request_type === 'update' && request.lab_id) {
        const fields = {};
        for (const key of ['name', 'city', 'country', 'latitude', 'longitude', 'opening_hours', 'date_opened', 'operational_status', 'website_url']) {
          if (request[key] != null) fields[key] = request[key];
        }
        if (Object.keys(fields).length) await Lab.update(request.lab_id, fields);
      } else if (action === 'approve' && request.request_type === 'delete' && request.lab_id) {
        await Lab.delete(request.lab_id);
      }

      await LabChangeRequest.update(request.id, {
        status: action === 'approve' ? 'approved' : 'rejected',
        resolved_by: req.user.id,
        resolved_at: new Date(),
      });
      res.json({ message: `Request ${action}d` });
    } catch {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
