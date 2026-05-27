# FilmStocks — Analog Photography Community

A film photography platform where users upload and explore photos organized by film stock, with per-stock forums, likes, and two-tier auth (user / admin).

## Tech stack

| Layer      | Tech                          |
|------------|-------------------------------|
| Frontend   | Vue 3, Vite, Pinia, Vue Router|
| Backend    | Node.js, Express (ESM)        |
| Database   | MySQL 8                       |
| Auth       | JWT + bcrypt (12 rounds)      |
| Uploads    | Multer (local disk)           |

## Architecture

```
backend/src/
  config/        # DB connection pool
  models/        # OOP BaseModel + domain models (User, FilmStock, Photo, Like, ForumPost, ForumReply)
  services/      # Business logic (AuthService)
  controllers/   # HTTP layer — thin, delegates to models/services
  middleware/    # JWT auth, adminOnly, multer upload
  routes/        # Express routers mapped to controllers
  app.js         # Express entry point

frontend/src/
  assets/        # Global CSS (design tokens + utilities)
  components/    # FilmStockCard, PhotoCard, PhotoUpload, ForumPostCard, NavBar
  views/         # HomeView, FilmStockView, ForumView, ForumPostView, Login, Register, Admin
  stores/        # Pinia auth store (persists to localStorage)
  services/      # Axios instance with JWT interceptor
  router/        # Vue Router with route guards
```

## Quick start

### 1. Database

```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p filmstocks < backend/database/seed.sql
```

Seed creates 13 film stocks and one admin account:
- **Email:** `admin@filmstocks.dev`
- **Password:** `Admin1234!`

### 2. Backend

```bash
cd backend
cp .env.example .env        # fill in DB_PASSWORD and JWT_SECRET
npm install
npm run dev                 # runs on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # runs on http://localhost:5173
```

## API endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me                          # requires auth

GET    /api/filmstocks
GET    /api/filmstocks/:id
POST   /api/filmstocks                       # admin only
PUT    /api/filmstocks/:id                   # admin only
DELETE /api/filmstocks/:id                   # admin only

GET    /api/photos/filmstock/:id
POST   /api/photos                           # auth required (multipart)
DELETE /api/photos/:id                       # auth + own/admin
POST   /api/photos/:id/like                  # auth required (toggles)

GET    /api/forum/filmstock/:id/posts
POST   /api/forum/posts                      # auth required
GET    /api/forum/posts/:id
PUT    /api/forum/posts/:id                  # auth + own/admin
DELETE /api/forum/posts/:id                  # auth + own/admin
POST   /api/forum/posts/:id/replies          # auth required
PUT    /api/forum/replies/:id                # auth + own/admin
DELETE /api/forum/replies/:id               # auth + own/admin

GET    /api/admin/users                      # admin only
PUT    /api/admin/users/:id/role             # admin only
DELETE /api/admin/users/:id                  # admin only
```

## Security

- Passwords hashed with **bcrypt** (12 salt rounds) — never stored in plain text
- **JWT** with configurable expiry (default 7 days), verified on every protected request
- **Rate limiting** on auth endpoints (10 req / 15 min)
- **Parameterized SQL** throughout — no string concatenation in queries
- **Helmet** sets security headers (CSP, HSTS, etc.)
- **CORS** locked to the configured `CLIENT_ORIGIN`
- File uploads: type whitelist (jpg/png/webp/gif), 10 MB max, random filename
- Users can only modify/delete their own content; admins can act on any content
