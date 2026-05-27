import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes       from './routes/auth.js';
import filmstockRoutes  from './routes/filmstocks.js';
import photoRoutes      from './routes/photos.js';
import forumRoutes      from './routes/forum.js';
import adminRoutes      from './routes/admin.js';
import profileRoutes    from './routes/profile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploads in development. Production should use object storage + CDN.
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1y',
  immutable: true,
}));

// API routes
app.use('/api/auth',       authRoutes);
app.use('/api/filmstocks', filmstockRoutes);
app.use('/api/photos',     photoRoutes);
app.use('/api/forum',      forumRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/profile',    profileRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

export default app;
