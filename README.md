# FilmStocks — Analog Photography Community

A film photography platform where users upload and explore photos organized by film stock, with per-stock forums, likes, and two-tier auth (user / admin).

## Tech stack

| Layer      | Tech                          |
|------------|-------------------------------|
| Frontend   | Vue 3, Vite, Pinia, Vue Router|
| Backend    | Node.js, Express (ESM)        |
| Database   | MySQL 8                       |
| Auth       | JWT + bcrypt (12 rounds)      |
| Uploads    | Multer + sharp image variants |
| Storage    | Local disk or S3/R2-compatible object storage |

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

Images are normalized with `sharp` in the Node backend. The Cloudflare upload path uses browser-side WebP compression before files reach R2, then tracks original versus stored bytes in the admin dashboard. Set `STORAGE_BUDGET_BYTES` to the storage budget you want the dashboard to show; the default is 10 GiB.

Cloudflare uploads include storage protection switches:

```text
UPLOADS_ENABLED=true                 # set false to stop uploads immediately
STORAGE_BUDGET_BYTES=10737418240     # 10 GiB dashboard/free-tier budget
STORAGE_KILL_SWITCH_PERCENT=95       # reject uploads before full budget
MAX_UPLOAD_BYTES=10485760            # reject oversized single uploads
```

### Docker backend + MySQL

```bash
docker compose up --build
```

This starts MySQL 8 and the backend API. The backend container includes the native image processing runtime used by `sharp`; uploaded files are stored in a Docker volume during local development.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # runs on http://localhost:5173
```

## Cloudflare-only deployment

This repo now supports a Cloudflare-native deployment:

- Frontend: Cloudflare Worker static assets
- Backend API: Cloudflare Worker at `/api/*`
- Database: Cloudflare D1
- Uploads: Cloudflare R2 served from `/uploads/*`

### 1. Create Cloudflare resources

```bash
wrangler d1 create filmstocks-db
wrangler r2 bucket create filmstocks-uploads
```

Copy the D1 `database_id` from the command output into both:

```text
wrangler.jsonc
frontend/wrangler.jsonc
```

Replace:

```text
REPLACE_WITH_D1_DATABASE_ID
```

### 2. Initialize D1

```bash
wrangler d1 execute filmstocks-db --file=cloudflare/schema.sql
wrangler d1 execute filmstocks-db --file=cloudflare/seed.sql
```

### 3. Set Cloudflare secrets

```bash
wrangler secret put JWT_SECRET
wrangler secret put GOOGLE_CLIENT_ID
```

Use the same Google OAuth web client ID for the frontend variable:

```text
VITE_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id.apps.googleusercontent.com
VITE_API_BASE_URL=/api
```

### 4. Cloudflare build settings

If deploying from the repo root:

```text
Build command: npm run build
Deploy command: npx wrangler deploy
Path: /
```

If deploying with `Path: frontend`:

```text
Build command: npm run build
Deploy command: npx wrangler deploy
Path: frontend
```

Both paths are configured. The Worker handles `/api/*`, `/uploads/*`, and static frontend assets.

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
GET    /api/admin/storage                    # admin only
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
