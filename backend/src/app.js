import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes       from './routes/auth.js';
import filmstockRoutes  from './routes/filmstocks.js';
import photoRoutes      from './routes/photos.js';
import forumRoutes      from './routes/forum.js';
import adminRoutes      from './routes/admin.js';
import profileRoutes    from './routes/profile.js';
import labRoutes        from './routes/labs.js';
import labRequestRoutes from './routes/labRequests.js';

// Fail fast: a weak or missing JWT secret is a critical misconfiguration.
const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters. Set it in .env before starting.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Trust the first proxy hop (nginx / Cloudflare) so rate limiters see real client IPs.
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Enforce HTTPS for 1 year; include sub-domains; allow browser preload list.
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", process.env.CLIENT_ORIGIN || 'http://localhost:5173'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));

// Cap JSON and URL-encoded bodies to 512 KB to prevent payload-flooding attacks.
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

// Global firewall: broad cap for every API route (1 000 req / 15 min per IP).
// This stops automated scanners and trivial DDoS without affecting real users.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please slow down' },
});
app.use('/api/', globalLimiter);

// Serve local uploads in development. Production should use object storage + CDN.
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1y',
  immutable: true,
}));

// API routes
app.use('/api/auth',         authRoutes);
app.use('/api/filmstocks',   filmstockRoutes);
app.use('/api/photos',       photoRoutes);
app.use('/api/forum',        forumRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/profile',      profileRoutes);
app.use('/api/labs',         labRoutes);
app.use('/api/lab-requests', labRequestRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

export default app;
