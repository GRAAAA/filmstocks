const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' };
const PBKDF2_ITERATIONS = 100000;
const JSON_BODY_LIMIT_BYTES = 64 * 1024;
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const MIN_JWT_SECRET_LENGTH = 32;
const IMAGE_TYPES = {
  gif: 'image/gif',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return preflight(request, env);

    try {
      if (url.pathname.startsWith('/uploads/')) return withSecurityHeaders(await serveUpload(url, env));
      if (!url.pathname.startsWith('/api/')) return withSecurityHeaders(await env.ASSETS.fetch(request));

      const response = await routeApi(request, env, url);
      return withSecurityHeaders(withCors(response, request, env));
    } catch (err) {
      console.error(err);
      const status = Number(err.status) || 500;
      const message = status >= 400 && status < 500 ? err.message : 'Internal server error';
      return withSecurityHeaders(withCors(json({ message }, status), request, env));
    }
  },
};

async function routeApi(request, env, url) {
  await enforceRateLimit(env.API_RATE_LIMITER, rateLimitKey(request, 'api'), 'Too many requests, please slow down');

  const path = url.pathname.replace(/^\/api/, '');
  const method = request.method;

  if (path === '/health') return json({ ok: true });

  if (method === 'POST' && ['/auth/register', '/auth/login', '/auth/google'].includes(path)) {
    await enforceRateLimit(env.AUTH_RATE_LIMITER, rateLimitKey(request, 'auth'), 'Too many sign-in attempts, please try again later');
    if (path === '/auth/register') return register(request, env);
    if (path === '/auth/login') return login(request, env);
    return googleLogin(request, env);
  }
  if (method === 'GET' && path === '/auth/me') return authMe(request, env);
  if (method === 'GET' && path === '/auth/verify-email') return verifyEmail(request, env);
  if (method === 'POST' && path === '/auth/resend-verification') {
    await enforceRateLimit(env.AUTH_RATE_LIMITER, rateLimitKey(request, 'auth'), 'Too many attempts, please try again later');
    return resendVerification(request, env);
  }

  if (method === 'GET' && path === '/filmstocks') return getFilmStocks(env);
  const stockMatch = path.match(/^\/filmstocks\/(\d+)$/);
  if (method === 'GET' && stockMatch) return getFilmStock(env, stockMatch[1]);
  if (method === 'POST' && path === '/filmstocks') return createFilmStock(request, env);
  if (method === 'PUT' && stockMatch) return updateFilmStock(request, env, stockMatch[1]);
  if (method === 'DELETE' && stockMatch) return deleteFilmStock(request, env, stockMatch[1]);

  const photosMatch = path.match(/^\/photos\/filmstock\/(\d+)$/);
  if (method === 'GET' && photosMatch) return getPhotos(request, env, url, photosMatch[1]);
  if (method === 'POST' && path === '/photos') return createPhoto(request, env);
  const photoLikeMatch = path.match(/^\/photos\/(\d+)\/like$/);
  if (method === 'POST' && photoLikeMatch) return toggleLike(request, env, photoLikeMatch[1]);
  const photoCommentsMatch = path.match(/^\/photos\/(\d+)\/comments$/);
  if (method === 'GET' && photoCommentsMatch) return getPhotoComments(env, photoCommentsMatch[1]);
  if (method === 'POST' && photoCommentsMatch) return createPhotoComment(request, env, photoCommentsMatch[1]);
  const photoDeleteMatch = path.match(/^\/photos\/(\d+)$/);
  if (method === 'DELETE' && photoDeleteMatch) return deletePhoto(request, env, photoDeleteMatch[1]);

  if (method === 'GET' && path === '/labs') return getLabs(env);
  if (method === 'POST' && path === '/labs') return createLab(request, env);
  const labMatch = path.match(/^\/labs\/(\d+)$/);
  if (method === 'GET' && labMatch) return getLab(env, labMatch[1]);
  if (method === 'DELETE' && labMatch) return deleteLab(request, env, labMatch[1]);
  const labReviewMatch = path.match(/^\/labs\/(\d+)\/reviews$/);
  if (method === 'POST' && labReviewMatch) return createLabReview(request, env, labReviewMatch[1]);
  if (method === 'POST' && path === '/lab-requests') return createLabRequest(request, env);

  const forumListMatch = path.match(/^\/forum\/filmstock\/(\d+)\/posts$/);
  if (method === 'GET' && forumListMatch) return getForumPosts(env, forumListMatch[1]);
  if (method === 'POST' && path === '/forum/posts') return createForumPost(request, env);
  const forumPostMatch = path.match(/^\/forum\/posts\/(\d+)$/);
  if (method === 'GET' && forumPostMatch) return getForumPost(env, forumPostMatch[1]);
  if (method === 'PUT' && forumPostMatch) return updateForumPost(request, env, forumPostMatch[1]);
  if (method === 'DELETE' && forumPostMatch) return deleteForumPost(request, env, forumPostMatch[1]);
  const forumReplyMatch = path.match(/^\/forum\/posts\/(\d+)\/replies$/);
  if (method === 'POST' && forumReplyMatch) return createForumReply(request, env, forumReplyMatch[1]);
  const replyMatch = path.match(/^\/forum\/replies\/(\d+)$/);
  if (method === 'PUT' && replyMatch) return updateForumReply(request, env, replyMatch[1]);
  if (method === 'DELETE' && replyMatch) return deleteForumReply(request, env, replyMatch[1]);

  if (method === 'GET' && path === '/profile/me') return profileMe(request, env);

  if (method === 'GET' && path === '/admin/storage') return adminStorage(request, env);
  if (method === 'GET' && path === '/admin/lab-requests') return adminLabRequests(request, env);
  const adminLabRequestMatch = path.match(/^\/admin\/lab-requests\/(\d+)\/(approve|reject)$/);
  if (method === 'POST' && adminLabRequestMatch) {
    return adminResolveLabRequest(request, env, adminLabRequestMatch[1], adminLabRequestMatch[2]);
  }
  if (method === 'GET' && path === '/admin/users') return adminUsers(request, env);
  const adminUserMatch = path.match(/^\/admin\/users\/(\d+)$/);
  const adminRoleMatch = path.match(/^\/admin\/users\/(\d+)\/role$/);
  if (method === 'PUT' && adminRoleMatch) return adminRole(request, env, adminRoleMatch[1]);
  if (method === 'DELETE' && adminUserMatch) return adminDeleteUser(request, env, adminUserMatch[1]);

  return json({ message: 'Not found' }, 404);
}

async function register(request, env) {
  const body = await readJson(request);
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (username.length < 3 || username.length > 50) return json({ message: 'Username must be 3-50 characters' }, 422);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ message: 'Valid email required' }, 422);
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return json({ message: 'Password must be 8+ characters with uppercase letter and number' }, 422);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1').bind(email, username).first();
  if (existing) return json({ message: 'Email or username already exists' }, 409);

  const passwordHash = await hashPassword(password);
  const token = crypto.randomUUID();
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const result = await env.DB.prepare(`
    INSERT INTO users (username, email, password_hash, auth_provider, verification_token, verification_token_expires_at)
    VALUES (?, ?, ?, 'local', ?, ?)
  `).bind(username, email, passwordHash, token, tokenExpires).run();
  const user = await getUserById(env, result.meta.last_row_id);
  const emailResult = await sendVerificationEmail(env, user, token);
  return json({ ...await authPayload(user, env), emailVerificationSent: emailResult.sent, emailQuotaExceeded: emailResult.quotaExceeded }, 201);
}

async function login(request, env) {
  const body = await readJson(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email).first();
  if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
    return json({ message: 'Invalid credentials' }, 401);
  }
  return json(await authPayload(user, env));
}

async function googleLogin(request, env) {
  if (!env.GOOGLE_CLIENT_ID) return json({ message: 'Google sign-in is not configured' }, 503);
  const { credential } = await readJson(request);
  if (!credential) return json({ message: 'Google credential is required' }, 422);

  const tokenInfo = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!tokenInfo.ok) return json({ message: 'Invalid Google credential' }, 401);
  const payload = await tokenInfo.json();
  if (payload.aud !== env.GOOGLE_CLIENT_ID || payload.email_verified !== 'true') {
    return json({ message: 'Invalid Google account' }, 401);
  }

  let user = await env.DB.prepare('SELECT * FROM users WHERE google_id = ? LIMIT 1').bind(payload.sub).first();
  if (!user) {
    user = await env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(payload.email).first();
    if (user) {
      await env.DB.prepare('UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?')
        .bind(payload.sub, payload.picture || null, user.id)
        .run();
      user = await getUserById(env, user.id);
    } else {
      const username = await uniqueUsername(env, payload.name || payload.email.split('@')[0]);
      const result = await env.DB.prepare(`
        INSERT INTO users (username, email, google_id, auth_provider, avatar_url, email_verified)
        VALUES (?, ?, ?, 'google', ?, 1)
      `).bind(username, payload.email, payload.sub, payload.picture || null).run();
      user = await getUserById(env, result.meta.last_row_id);
    }
  }
  return json(await authPayload(user, env));
}

async function authMe(request, env) {
  const user = await requireUser(request, env);
  return json(safeUser(user));
}

async function getFilmStocks(env) {
  const { results } = await env.DB.prepare(`
    SELECT fs.*,
      COUNT(DISTINCT p.id) AS photo_count,
      COUNT(DISTINCT fp.id) AS post_count
    FROM film_stocks fs
    LEFT JOIN photos p ON p.film_stock_id = fs.id
    LEFT JOIN forum_posts fp ON fp.film_stock_id = fs.id
    GROUP BY fs.id
    ORDER BY fs.type, fs.brand, fs.name
  `).all();
  return json(results, 200, { 'cache-control': 'public, max-age=300' });
}

async function getFilmStock(env, id) {
  const stock = await env.DB.prepare(`
    SELECT fs.*,
      COUNT(DISTINCT p.id) AS photo_count,
      COUNT(DISTINCT fp.id) AS post_count
    FROM film_stocks fs
    LEFT JOIN photos p ON p.film_stock_id = fs.id
    LEFT JOIN forum_posts fp ON fp.film_stock_id = fs.id
    WHERE fs.id = ?
    GROUP BY fs.id
  `).bind(id).first();
  if (!stock) return json({ message: 'Film stock not found' }, 404);
  return json(stock, 200, { 'cache-control': 'public, max-age=120' });
}

async function createFilmStock(request, env) {
  await requireAdmin(request, env);
  assertBodySize(request, maxUploadBytes(env) + MULTIPART_OVERHEAD_BYTES);
  const form = await request.formData();
  const name = String(form.get('name') || '').trim();
  const brand = String(form.get('brand') || '').trim();
  const type = String(form.get('type') || '').trim();
  if (!name || !brand || !['bw', 'color_negative', 'reversal'].includes(type)) {
    return json({ message: 'Name, brand, and valid type are required' }, 422);
  }
  const coverUrl = await maybeStoreCover(form, env);
  const result = await env.DB.prepare(`
    INSERT INTO film_stocks (name, brand, type, iso, description, characteristics, cover_image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    name,
    brand,
    type,
    form.get('iso') || null,
    form.get('description') || null,
    form.get('characteristics') || null,
    coverUrl
  ).run();
  return json(await env.DB.prepare('SELECT * FROM film_stocks WHERE id = ?').bind(result.meta.last_row_id).first(), 201);
}

async function updateFilmStock(request, env, id) {
  await requireAdmin(request, env);
  const existing = await env.DB.prepare('SELECT * FROM film_stocks WHERE id = ?').bind(id).first();
  if (!existing) return json({ message: 'Film stock not found' }, 404);
  assertBodySize(request, maxUploadBytes(env) + MULTIPART_OVERHEAD_BYTES);
  const form = await request.formData();
  const coverUrl = await maybeStoreCover(form, env);
  await env.DB.prepare(`
    UPDATE film_stocks
    SET name = COALESCE(?, name),
      brand = COALESCE(?, brand),
      type = COALESCE(?, type),
      iso = COALESCE(?, iso),
      description = COALESCE(?, description),
      characteristics = COALESCE(?, characteristics),
      cover_image_url = COALESCE(?, cover_image_url),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    form.get('name') || null,
    form.get('brand') || null,
    form.get('type') || null,
    form.get('iso') || null,
    form.get('description') || null,
    form.get('characteristics') || null,
    coverUrl,
    id
  ).run();
  return json(await env.DB.prepare('SELECT * FROM film_stocks WHERE id = ?').bind(id).first());
}

async function deleteFilmStock(request, env, id) {
  await requireAdmin(request, env);
  await env.DB.prepare('DELETE FROM film_stocks WHERE id = ?').bind(id).run();
  return new Response(null, { status: 204 });
}

async function getPhotos(request, env, url, filmStockId) {
  const user = await optionalUser(request, env);
  const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '24'), 1), 60);
  const offset = (page - 1) * limit;
  const likedSelect = user ? 'EXISTS(SELECT 1 FROM photo_likes pl WHERE pl.photo_id = p.id AND pl.user_id = ?) AS liked_by_me' : '0 AS liked_by_me';
  const binds = user ? [user.id, filmStockId, limit, offset] : [filmStockId, limit, offset];
  const { results } = await env.DB.prepare(`
    SELECT p.*, u.username, u.avatar_url, l.name AS lab_name, l.city AS lab_city, l.country AS lab_country, ${likedSelect}
    FROM photos p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN labs l ON l.id = p.lab_id
    WHERE p.film_stock_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...binds).all();
  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM photos WHERE film_stock_id = ?').bind(filmStockId).first();
  return json({ data: results, pagination: { page, limit, total: count.total, hasMore: offset + results.length < count.total } });
}

async function createPhoto(request, env) {
  const user = await requireUser(request, env);
  await enforceRateLimit(env.UPLOAD_RATE_LIMITER, `upload:${user.id}`, 'Upload limit reached, please try again later');
  assertBodySize(request, maxUploadBytes(env) + MULTIPART_OVERHEAD_BYTES);
  const form = await request.formData();
  const file = form.get('image');
  const filmStockId = form.get('filmStockId');
  if (!file || typeof file === 'string') return json({ message: 'Image file is required' }, 400);
  if (!filmStockId) return json({ message: 'Film stock ID required' }, 422);

  const sizeBytes = Number(file.size || 0);
  const image = await validateImageFile(file, maxUploadBytes(env));
  const uploadGuard = await getUploadGuard(env, sizeBytes);
  if (!uploadGuard.uploadsEnabled) {
    return json({ message: 'Uploads are temporarily disabled' }, 503);
  }
  if (uploadGuard.fileTooLarge) {
    return json({
      message: `Upload is too large. Max size is ${uploadGuard.maxUploadBytes} bytes`,
      max_upload_bytes: uploadGuard.maxUploadBytes,
    }, 413);
  }
  if (uploadGuard.storageBlocked) {
    return json({
      message: 'Storage limit reached. Uploads are disabled to stay within the free plan budget.',
      storage_size_bytes: uploadGuard.storageSizeBytes,
      storage_limit_bytes: uploadGuard.storageSoftLimitBytes,
      storage_remaining_bytes: uploadGuard.storageRemainingBytes,
    }, 507);
  }

  const stock = await env.DB.prepare('SELECT id FROM film_stocks WHERE id = ?').bind(filmStockId).first();
  if (!stock) return json({ message: 'Film stock not found' }, 404);

  const key = `photos/${crypto.randomUUID()}.${image.ext}`;
  await env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: image.contentType },
  });
  const imageUrl = `/uploads/${key}`;
  const originalSizeBytes = Number(form.get('originalSizeBytes') || sizeBytes);
  const savedBytes = Math.max(originalSizeBytes - sizeBytes, 0);
  const frameBackgroundColor = sanitizeHexColor(form.get('frameBackgroundColor'));
  const frameGapPx = clampInteger(form.get('frameGapPx'), 0, 80);
  const frameBorderWidthPx = clampInteger(form.get('frameBorderWidthPx'), 0, 24);
  const frameBorderColor = sanitizeHexColor(form.get('frameBorderColor'));
  const frameImagePosition = sanitizeImagePosition(form.get('frameImagePosition'));
  const cameraMake = sanitizeText(form.get('cameraMake'), 100);
  const cameraModel = sanitizeText(form.get('cameraModel'), 100);
  const lensModel = sanitizeText(form.get('lensModel'), 100);
  const focalLengthMm = clampInteger(form.get('focalLengthMm'), 1, 2000) || null;
  const result = await env.DB.prepare(`
    INSERT INTO photos (
      film_stock_id,
      user_id,
      title,
      description,
      image_url,
      image_thumb_url,
      image_medium_url,
      image_large_url,
      storage_key,
      scanner_model,
      camera_make,
      camera_model,
      lens_model,
      focal_length_mm,
      lab_id,
      frame_background_color,
      frame_gap_px,
      frame_border_width_px,
      frame_border_color,
      frame_image_position,
      original_size_bytes,
      optimized_size_bytes,
      storage_size_bytes,
      storage_saved_bytes,
      variant_count
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    filmStockId,
    user.id,
    form.get('title') || null,
    form.get('description') || null,
    imageUrl,
    imageUrl,
    imageUrl,
    imageUrl,
    key,
    form.get('scannerModel') || null,
    cameraMake,
    cameraModel,
    lensModel,
    focalLengthMm,
    form.get('labId') || null,
    frameBackgroundColor,
    frameGapPx,
    frameBorderWidthPx,
    frameBorderColor,
    frameImagePosition,
    originalSizeBytes,
    sizeBytes,
    sizeBytes,
    savedBytes,
    1
  ).run();
  const photo = await env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(result.meta.last_row_id).first();
  return json(photo, 201);
}

function sanitizeText(value, maxLen) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLen);
  return trimmed || null;
}

function sanitizeHexColor(value) {
  if (typeof value !== 'string') return null;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : null;
}

function clampInteger(value, min, max) {
  const number = parseInt(value, 10);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
}

function sanitizeImagePosition(value) {
  const position = String(value || 'center center');
  return [
    'left top', 'center top', 'right top',
    'left center', 'center center', 'right center',
    'left bottom', 'center bottom', 'right bottom',
  ].includes(position) ? position : 'center center';
}

async function getPhotoComments(env, photoId) {
  const { results } = await env.DB.prepare(`
    SELECT pc.*, u.username, u.avatar_url
    FROM photo_comments pc
    JOIN users u ON u.id = pc.user_id
    WHERE pc.photo_id = ?
    ORDER BY pc.created_at ASC
  `).bind(photoId).all();
  return json(results);
}

async function createPhotoComment(request, env, photoId) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  const content = String(body.content || '').trim();
  if (!content) return json({ message: 'Comment is required' }, 422);
  if (content.length > 1000) return json({ message: 'Comment must be 1000 characters or less' }, 422);
  const photo = await env.DB.prepare('SELECT id FROM photos WHERE id = ?').bind(photoId).first();
  if (!photo) return json({ message: 'Photo not found' }, 404);
  const result = await env.DB.prepare(`
    INSERT INTO photo_comments (photo_id, user_id, content)
    VALUES (?, ?, ?)
  `).bind(photoId, user.id, content).run();
  const comment = await env.DB.prepare(`
    SELECT pc.*, u.username, u.avatar_url
    FROM photo_comments pc
    JOIN users u ON u.id = pc.user_id
    WHERE pc.id = ?
  `).bind(result.meta.last_row_id).first();
  return json(comment, 201);
}

async function getLabs(env) {
  const { results } = await env.DB.prepare(`
    SELECT l.*,
      COALESCE(AVG(lr.rating), 0) AS average_rating,
      COUNT(lr.id) AS review_count
    FROM labs l
    LEFT JOIN lab_reviews lr ON lr.lab_id = l.id
    GROUP BY l.id
    ORDER BY l.country, l.city, l.name
  `).all();
  return json(results, 200, { 'cache-control': 'public, max-age=300' });
}

async function getLab(env, id) {
  const lab = await env.DB.prepare(`
    SELECT l.*,
      COALESCE(AVG(lr.rating), 0) AS average_rating,
      COUNT(lr.id) AS review_count
    FROM labs l
    LEFT JOIN lab_reviews lr ON lr.lab_id = l.id
    WHERE l.id = ?
    GROUP BY l.id
  `).bind(id).first();
  if (!lab) return json({ message: 'Lab not found' }, 404);
  const { results: reviews } = await env.DB.prepare(`
    SELECT lr.*, u.username, u.avatar_url
    FROM lab_reviews lr
    JOIN users u ON u.id = lr.user_id
    WHERE lr.lab_id = ?
    ORDER BY lr.created_at DESC
  `).bind(id).all();
  return json({ ...lab, reviews });
}

async function createLab(request, env) {
  const user = await requireAdmin(request, env);
  const body = await readJson(request);
  const name = String(body.name || '').trim();
  if (!name) return json({ message: 'Lab name is required' }, 422);
  const result = await env.DB.prepare(`
    INSERT INTO labs (name, city, country, latitude, longitude, opening_hours, date_opened, operational_status, website_url, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    name,
    String(body.city || '').trim() || null,
    String(body.country || '').trim() || null,
    numberOrNull(body.latitude),
    numberOrNull(body.longitude),
    String(body.opening_hours || '').trim() || null,
    dateOrNull(body.date_opened),
    labStatusOrDefault(body.operational_status),
    httpUrlOrNull(body.website_url),
    user.id
  ).run();
  return json(await env.DB.prepare('SELECT * FROM labs WHERE id = ?').bind(result.meta.last_row_id).first(), 201);
}

async function deleteLab(request, env, labId) {
  await requireAdmin(request, env);
  await env.DB.prepare('DELETE FROM labs WHERE id = ?').bind(labId).run();
  return new Response(null, { status: 204 });
}

async function createLabRequest(request, env) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  const requestType = String(body.request_type || '').trim();
  if (!['add', 'update', 'delete'].includes(requestType)) return json({ message: 'Invalid request type' }, 422);
  if (requestType === 'add' && !String(body.name || '').trim()) return json({ message: 'Lab name is required' }, 422);
  if (['update', 'delete'].includes(requestType) && !body.lab_id) return json({ message: 'Lab is required' }, 422);

  const result = await env.DB.prepare(`
    INSERT INTO lab_change_requests (
      lab_id, user_id, request_type, name, city, country,
      latitude, longitude, opening_hours, date_opened, operational_status, website_url, note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.lab_id || null,
    user.id,
    requestType,
    String(body.name || '').trim() || null,
    String(body.city || '').trim() || null,
    String(body.country || '').trim() || null,
    numberOrNull(body.latitude),
    numberOrNull(body.longitude),
    String(body.opening_hours || '').trim() || null,
    dateOrNull(body.date_opened),
    labStatusOrNull(body.operational_status),
    httpUrlOrNull(body.website_url),
    String(body.note || '').trim() || null
  ).run();
  return json(await env.DB.prepare('SELECT * FROM lab_change_requests WHERE id = ?').bind(result.meta.last_row_id).first(), 201);
}

async function createLabReview(request, env, labId) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  const rating = Math.min(Math.max(parseInt(body.rating || '0'), 1), 5);
  const comment = String(body.comment || '').trim();
  const lab = await env.DB.prepare('SELECT id FROM labs WHERE id = ?').bind(labId).first();
  if (!lab) return json({ message: 'Lab not found' }, 404);
  await env.DB.prepare(`
    INSERT INTO lab_reviews (lab_id, user_id, rating, comment)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(lab_id, user_id) DO UPDATE SET
      rating = excluded.rating,
      comment = excluded.comment,
      updated_at = CURRENT_TIMESTAMP
  `).bind(labId, user.id, rating, comment || null).run();
  return getLab(env, labId);
}

async function toggleLike(request, env, photoId) {
  const user = await requireUser(request, env);
  const existing = await env.DB.prepare('SELECT id FROM photo_likes WHERE photo_id = ? AND user_id = ?')
    .bind(photoId, user.id)
    .first();
  if (existing) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM photo_likes WHERE id = ?').bind(existing.id),
      env.DB.prepare('UPDATE photos SET likes_count = MAX(likes_count - 1, 0) WHERE id = ?').bind(photoId),
    ]);
    return json({ liked: false });
  }
  await env.DB.batch([
    env.DB.prepare('INSERT INTO photo_likes (photo_id, user_id) VALUES (?, ?)').bind(photoId, user.id),
    env.DB.prepare('UPDATE photos SET likes_count = likes_count + 1 WHERE id = ?').bind(photoId),
  ]);
  return json({ liked: true });
}

async function deletePhoto(request, env, photoId) {
  const user = await requireUser(request, env);
  const photo = await env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(photoId).first();
  if (!photo) return json({ message: 'Photo not found' }, 404);
  if (user.role !== 'admin' && photo.user_id !== user.id) return json({ message: 'Forbidden' }, 403);
  if (photo.storage_key) await env.PHOTOS.delete(photo.storage_key);
  await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(photoId).run();
  return new Response(null, { status: 204 });
}

async function getForumPosts(env, filmStockId) {
  const { results } = await env.DB.prepare(`
    SELECT fp.*, u.username, u.avatar_url
    FROM forum_posts fp
    JOIN users u ON u.id = fp.user_id
    WHERE fp.film_stock_id = ?
    ORDER BY fp.created_at DESC
  `).bind(filmStockId).all();
  return json(results);
}

async function createForumPost(request, env) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  if (!body.filmStockId || String(body.title || '').trim().length < 3 || String(body.content || '').trim().length < 1) {
    return json({ message: 'Title, content, and film stock are required' }, 422);
  }
  const result = await env.DB.prepare(`
    INSERT INTO forum_posts (film_stock_id, user_id, title, content)
    VALUES (?, ?, ?, ?)
  `).bind(body.filmStockId, user.id, body.title.trim(), body.content.trim()).run();
  const post = await env.DB.prepare('SELECT * FROM forum_posts WHERE id = ?').bind(result.meta.last_row_id).first();
  return json(post, 201);
}

async function getForumPost(env, postId) {
  const post = await env.DB.prepare(`
    SELECT fp.*, u.username, u.avatar_url, fs.name AS film_stock_name, fs.type AS film_stock_type
    FROM forum_posts fp
    JOIN users u ON u.id = fp.user_id
    JOIN film_stocks fs ON fs.id = fp.film_stock_id
    WHERE fp.id = ?
  `).bind(postId).first();
  if (!post) return json({ message: 'Post not found' }, 404);
  const { results: replies } = await env.DB.prepare(`
    SELECT fr.*, u.username, u.avatar_url
    FROM forum_replies fr
    JOIN users u ON u.id = fr.user_id
    WHERE fr.post_id = ?
    ORDER BY fr.created_at ASC
  `).bind(postId).all();
  return json({ ...post, replies });
}

async function updateForumPost(request, env, postId) {
  const user = await requireUser(request, env);
  const post = await env.DB.prepare('SELECT * FROM forum_posts WHERE id = ?').bind(postId).first();
  if (!post) return json({ message: 'Post not found' }, 404);
  if (user.role !== 'admin' && post.user_id !== user.id) return json({ message: 'Forbidden' }, 403);
  const body = await readJson(request);
  await env.DB.prepare('UPDATE forum_posts SET title = COALESCE(?, title), content = COALESCE(?, content), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(body.title || null, body.content || null, postId)
    .run();
  return json(await env.DB.prepare('SELECT * FROM forum_posts WHERE id = ?').bind(postId).first());
}

async function deleteForumPost(request, env, postId) {
  const user = await requireUser(request, env);
  const post = await env.DB.prepare('SELECT * FROM forum_posts WHERE id = ?').bind(postId).first();
  if (!post) return json({ message: 'Post not found' }, 404);
  if (user.role !== 'admin' && post.user_id !== user.id) return json({ message: 'Forbidden' }, 403);
  await env.DB.prepare('DELETE FROM forum_posts WHERE id = ?').bind(postId).run();
  return new Response(null, { status: 204 });
}

async function createForumReply(request, env, postId) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  const content = String(body.content || '').trim();
  if (!content) return json({ message: 'Reply content is required' }, 422);
  const result = await env.DB.prepare(`
    INSERT INTO forum_replies (post_id, parent_reply_id, user_id, content)
    VALUES (?, ?, ?, ?)
  `).bind(postId, body.parentReplyId || null, user.id, content).run();
  await env.DB.prepare('UPDATE forum_posts SET reply_count = reply_count + 1 WHERE id = ?').bind(postId).run();
  const reply = await env.DB.prepare(`
    SELECT fr.*, u.username, u.avatar_url
    FROM forum_replies fr
    JOIN users u ON u.id = fr.user_id
    WHERE fr.id = ?
  `).bind(result.meta.last_row_id).first();
  return json(reply, 201);
}

async function updateForumReply(request, env, replyId) {
  const user = await requireUser(request, env);
  const reply = await env.DB.prepare('SELECT * FROM forum_replies WHERE id = ?').bind(replyId).first();
  if (!reply) return json({ message: 'Reply not found' }, 404);
  if (user.role !== 'admin' && reply.user_id !== user.id) return json({ message: 'Forbidden' }, 403);
  const body = await readJson(request);
  await env.DB.prepare('UPDATE forum_replies SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(String(body.content || '').trim(), replyId)
    .run();
  return json(await env.DB.prepare('SELECT * FROM forum_replies WHERE id = ?').bind(replyId).first());
}

async function deleteForumReply(request, env, replyId) {
  const user = await requireUser(request, env);
  const reply = await env.DB.prepare('SELECT * FROM forum_replies WHERE id = ?').bind(replyId).first();
  if (!reply) return json({ message: 'Reply not found' }, 404);
  if (user.role !== 'admin' && reply.user_id !== user.id) return json({ message: 'Forbidden' }, 403);
  await env.DB.prepare('DELETE FROM forum_replies WHERE id = ?').bind(replyId).run();
  await env.DB.prepare('UPDATE forum_posts SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?').bind(reply.post_id).run();
  return new Response(null, { status: 204 });
}

async function profileMe(request, env) {
  const user = await requireUser(request, env);
  const { results: photos } = await env.DB.prepare(`
    SELECT p.*, u.username, fs.name AS film_stock_name, fs.type AS film_stock_type, 0 AS liked_by_me
    FROM photos p
    JOIN users u ON u.id = p.user_id
    JOIN film_stocks fs ON fs.id = p.film_stock_id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).bind(user.id).all();
  const { results: replies } = await env.DB.prepare(`
    SELECT fr.*, fp.title AS post_title, fp.film_stock_id, fs.name AS film_stock_name,
      parent.content AS parent_content, parent_user.username AS parent_username
    FROM forum_replies fr
    JOIN forum_posts fp ON fp.id = fr.post_id
    JOIN film_stocks fs ON fs.id = fp.film_stock_id
    LEFT JOIN forum_replies parent ON parent.id = fr.parent_reply_id
    LEFT JOIN users parent_user ON parent_user.id = parent.user_id
    WHERE fr.user_id = ?
    ORDER BY fr.created_at DESC
  `).bind(user.id).all();
  return json({
    user: safeUser(user),
    stats: {
      photos: photos.length,
      replies: replies.length,
      likes: photos.reduce((sum, photo) => sum + Number(photo.likes_count || 0), 0),
    },
    photos,
    replies,
  });
}

async function adminUsers(request, env) {
  await requireAdmin(request, env);
  const { results } = await env.DB.prepare(`
    SELECT id, username, email, auth_provider, role, avatar_url, created_at
    FROM users
    ORDER BY created_at DESC
  `).all();
  return json(results);
}

async function adminLabRequests(request, env) {
  await requireAdmin(request, env);
  const { results } = await env.DB.prepare(`
    SELECT lcr.*, u.username, l.name AS lab_name
    FROM lab_change_requests lcr
    JOIN users u ON u.id = lcr.user_id
    LEFT JOIN labs l ON l.id = lcr.lab_id
    WHERE lcr.status = 'pending'
    ORDER BY lcr.created_at ASC
  `).all();
  return json(results);
}

async function adminResolveLabRequest(request, env, requestId, action) {
  const admin = await requireAdmin(request, env);
  const requestRow = await env.DB.prepare('SELECT * FROM lab_change_requests WHERE id = ?').bind(requestId).first();
  if (!requestRow) return json({ message: 'Request not found' }, 404);
  if (requestRow.status !== 'pending') return json({ message: 'Request already resolved' }, 409);

  if (action === 'approve') {
    if (requestRow.request_type === 'add') {
      await env.DB.prepare(`
        INSERT INTO labs (name, city, country, latitude, longitude, opening_hours, date_opened, operational_status, website_url, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        requestRow.name,
        requestRow.city,
        requestRow.country,
        requestRow.latitude,
        requestRow.longitude,
        requestRow.opening_hours,
        requestRow.date_opened,
        labStatusOrDefault(requestRow.operational_status),
        requestRow.website_url,
        requestRow.user_id
      ).run();
    } else if (requestRow.request_type === 'update') {
      await env.DB.prepare(`
        UPDATE labs
        SET name = COALESCE(?, name),
          city = COALESCE(?, city),
          country = COALESCE(?, country),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          opening_hours = COALESCE(?, opening_hours),
          date_opened = COALESCE(?, date_opened),
          operational_status = COALESCE(?, operational_status),
          website_url = COALESCE(?, website_url)
        WHERE id = ?
      `).bind(
        requestRow.name,
        requestRow.city,
        requestRow.country,
        requestRow.latitude,
        requestRow.longitude,
        requestRow.opening_hours,
        requestRow.date_opened,
        labStatusOrNull(requestRow.operational_status),
        requestRow.website_url,
        requestRow.lab_id
      ).run();
    } else if (requestRow.request_type === 'delete') {
      await env.DB.prepare('DELETE FROM labs WHERE id = ?').bind(requestRow.lab_id).run();
    }
  }

  await env.DB.prepare(`
    UPDATE lab_change_requests
    SET status = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
    WHERE id = ?
  `).bind(action === 'approve' ? 'approved' : 'rejected', admin.id, requestId).run();
  return json({ message: `Request ${action}d` });
}

async function adminStorage(request, env) {
  await requireAdmin(request, env);
  const stats = await getStorageStats(env);
  const storageLimitBytes = Number(env.STORAGE_BUDGET_BYTES || 10737418240);
  const storageKillSwitchPercent = clampPercent(Number(env.STORAGE_KILL_SWITCH_PERCENT || 95));
  const storageSoftLimitBytes = Math.floor(storageLimitBytes * (storageKillSwitchPercent / 100));
  const storageSizeBytes = Number(stats.storage_size_bytes || 0);
  const originalSizeBytes = Number(stats.original_size_bytes || 0);
  const optimizedSizeBytes = Number(stats.optimized_size_bytes || 0);
  const storageRemainingBytes = Math.max(storageSoftLimitBytes - storageSizeBytes, 0);

  return json({
    photo_count: Number(stats.photo_count || 0),
    variant_count: Number(stats.variant_count || 0),
    unique_hash_count: Number(stats.unique_hash_count || 0),
    original_size_bytes: originalSizeBytes,
    optimized_size_bytes: optimizedSizeBytes,
    storage_size_bytes: storageSizeBytes,
    storage_saved_bytes: Number(stats.storage_saved_bytes || 0),
    storage_limit_bytes: storageLimitBytes,
    storage_soft_limit_bytes: storageSoftLimitBytes,
    storage_remaining_bytes: storageRemainingBytes,
    storage_kill_switch_percent: storageKillSwitchPercent,
    uploads_enabled: envFlag(env.UPLOADS_ENABLED, true),
    upload_blocked: !envFlag(env.UPLOADS_ENABLED, true) || storageRemainingBytes <= 0,
    max_upload_bytes: Number(env.MAX_UPLOAD_BYTES || 10485760),
    storage_used_percent: storageLimitBytes > 0
      ? Math.min((storageSizeBytes / storageLimitBytes) * 100, 100)
      : 0,
    storage_soft_used_percent: storageSoftLimitBytes > 0
      ? Math.min((storageSizeBytes / storageSoftLimitBytes) * 100, 100)
      : 0,
    compression_ratio: originalSizeBytes > 0
      ? optimizedSizeBytes / originalSizeBytes
      : 0,
  });
}

async function getUploadGuard(env, incomingBytes) {
  const uploadsEnabled = envFlag(env.UPLOADS_ENABLED, true);
  const maxUploadBytes = Number(env.MAX_UPLOAD_BYTES || 10485760);
  const storageLimitBytes = Number(env.STORAGE_BUDGET_BYTES || 10737418240);
  const storageKillSwitchPercent = clampPercent(Number(env.STORAGE_KILL_SWITCH_PERCENT || 95));
  const storageSoftLimitBytes = Math.floor(storageLimitBytes * (storageKillSwitchPercent / 100));
  const stats = await getStorageStats(env);
  const storageSizeBytes = Number(stats.storage_size_bytes || 0);
  const storageRemainingBytes = Math.max(storageSoftLimitBytes - storageSizeBytes, 0);

  return {
    uploadsEnabled,
    maxUploadBytes,
    fileTooLarge: maxUploadBytes > 0 && incomingBytes > maxUploadBytes,
    storageBlocked: storageSoftLimitBytes > 0 && storageSizeBytes + incomingBytes > storageSoftLimitBytes,
    storageSizeBytes,
    storageSoftLimitBytes,
    storageRemainingBytes,
  };
}

async function getStorageStats(env) {
  return env.DB.prepare(`
    SELECT
      COUNT(*) AS photo_count,
      COALESCE(SUM(original_size_bytes), 0) AS original_size_bytes,
      COALESCE(SUM(optimized_size_bytes), 0) AS optimized_size_bytes,
      COALESCE(SUM(storage_size_bytes), 0) AS storage_size_bytes,
      COALESCE(SUM(storage_saved_bytes), 0) AS storage_saved_bytes,
      COALESCE(SUM(variant_count), 0) AS variant_count,
      COUNT(DISTINCT phash) AS unique_hash_count
    FROM photos
  `).first();
}

function envFlag(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return !['0', 'false', 'off', 'no'].includes(String(value).toLowerCase());
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 95;
  return Math.min(Math.max(value, 1), 100);
}

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateOrNull(value) {
  const date = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function labStatusOrNull(value) {
  const status = String(value || '').trim();
  return ['open', 'temporarily_closed', 'closed', 'unknown'].includes(status) ? status : null;
}

function labStatusOrDefault(value) {
  return labStatusOrNull(value) || 'unknown';
}

function httpUrlOrNull(value) {
  const input = String(value || '').trim();
  if (!input) return null;
  try {
    const url = new URL(input);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

async function adminRole(request, env, id) {
  const admin = await requireAdmin(request, env);
  const body = await readJson(request);
  if (!['user', 'admin'].includes(body.role)) return json({ message: 'Invalid role' }, 422);
  if (Number(id) === admin.id) return json({ message: 'You cannot change your own role' }, 422);
  await env.DB.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(body.role, id).run();
  return json(await getUserById(env, id));
}

async function adminDeleteUser(request, env, id) {
  const user = await requireAdmin(request, env);
  if (Number(id) === user.id) return json({ message: 'You cannot delete yourself' }, 422);
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return new Response(null, { status: 204 });
}

async function serveUpload(url, env) {
  let key;
  try {
    key = decodeURIComponent(url.pathname.replace(/^\/uploads\//, ''));
  } catch {
    return new Response('Not found', { status: 404 });
  }
  const match = key.match(/^(photos|covers)\/[0-9a-f-]+\.(gif|jpg|png|webp)$/);
  if (!match) return new Response('Not found', { status: 404 });
  const object = await env.PHOTOS.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'content-type': IMAGE_TYPES[match[2]],
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function maybeStoreCover(form, env) {
  const file = form.get('cover');
  if (!file || typeof file === 'string') return null;
  const image = await validateImageFile(file, maxUploadBytes(env));
  const key = `covers/${crypto.randomUUID()}.${image.ext}`;
  await env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: image.contentType },
  });
  return `/uploads/${key}`;
}

async function authPayload(user, env) {
  return { user: safeUser(user), token: await signJwt({ id: user.id, username: user.username, role: user.role }, env) };
}

async function requireUser(request, env) {
  const user = await optionalUser(request, env);
  if (!user) throw Object.assign(new Error('Authentication required'), { status: 401 });
  return user;
}

async function requireAdmin(request, env) {
  const user = await requireUser(request, env);
  if (user.role !== 'admin') throw Object.assign(new Error('Admin access required'), { status: 403 });
  return user;
}

async function optionalUser(request, env) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const payload = await verifyJwt(header.slice(7), env);
  if (!payload) return null;
  return getUserById(env, payload.id);
}

async function verifyEmail(request, env) {
  const url = new URL(request.url);
  const token = String(url.searchParams.get('token') || '').trim();
  if (!token) return json({ message: 'Verification token is required' }, 422);

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE verification_token = ? LIMIT 1'
  ).bind(token).first();

  if (!user) return json({ message: 'Invalid or expired verification link' }, 400);
  if (user.email_verified) return json({ message: 'Email already verified', alreadyVerified: true });

  if (new Date(user.verification_token_expires_at) < new Date()) {
    return json({ message: 'Verification link has expired. Please request a new one.', expired: true }, 400);
  }

  await env.DB.prepare(
    'UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires_at = NULL WHERE id = ?'
  ).bind(user.id).run();

  return json({ message: 'Email verified successfully', verified: true });
}

async function resendVerification(request, env) {
  const user = await requireUser(request, env);
  const fullUser = await getUserById(env, user.id);

  if (fullUser.email_verified) return json({ message: 'Email is already verified' }, 400);

  const token = crypto.randomUUID();
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(
    'UPDATE users SET verification_token = ?, verification_token_expires_at = ? WHERE id = ?'
  ).bind(token, tokenExpires, user.id).run();

  const emailResult = await sendVerificationEmail(env, fullUser, token);

  if (emailResult.quotaExceeded) {
    return json({ message: 'Email verification is temporarily unavailable — our daily limit has been reached. Please try again tomorrow.' }, 503);
  }
  if (!emailResult.sent) {
    return json({ message: 'Failed to send verification email. Please try again later.' }, 500);
  }

  return json({ message: 'Verification email sent. Check your inbox.' });
}

async function sendVerificationEmail(env, user, token) {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping verification email');
    return { sent: false, quotaExceeded: false };
  }

  const quota = await checkEmailQuota(env);
  if (!quota.allowed) return { sent: false, quotaExceeded: true };

  const verifyUrl = `${env.CLIENT_ORIGIN || 'https://filmsofapril.me'}/verify-email?token=${token}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FilmStocks <noreply@filmsofapril.me>',
      to: [user.email],
      subject: 'Verify your FilmStocks email',
      html: verificationEmailHtml(user.username, verifyUrl),
    }),
  });

  if (!res.ok) {
    console.error('Resend API error:', res.status, await res.text());
    return { sent: false, quotaExceeded: false };
  }

  await incrementEmailCount(env);
  return { sent: true, quotaExceeded: false };
}

async function checkEmailQuota(env) {
  if (!env.EMAIL_COUNTER) return { allowed: true };
  const now = new Date();
  const monthKey = `email:month:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const dayKey   = `email:day:${now.toISOString().slice(0, 10)}`;
  const [monthCount, dayCount] = await Promise.all([
    env.EMAIL_COUNTER.get(monthKey).then(v => Number(v || 0)),
    env.EMAIL_COUNTER.get(dayKey).then(v => Number(v || 0)),
  ]);
  if (monthCount >= 2700) return { allowed: false, reason: 'monthly' };
  if (dayCount >= 90)     return { allowed: false, reason: 'daily' };
  return { allowed: true };
}

async function incrementEmailCount(env) {
  if (!env.EMAIL_COUNTER) return;
  const now = new Date();
  const monthKey = `email:month:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const dayKey   = `email:day:${now.toISOString().slice(0, 10)}`;
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const endOfDay   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const [mc, dc] = await Promise.all([
    env.EMAIL_COUNTER.get(monthKey).then(v => Number(v || 0)),
    env.EMAIL_COUNTER.get(dayKey).then(v => Number(v || 0)),
  ]);
  await Promise.all([
    env.EMAIL_COUNTER.put(monthKey, String(mc + 1), { expirationTtl: Math.ceil((endOfMonth - now) / 1000) }),
    env.EMAIL_COUNTER.put(dayKey,   String(dc + 1), { expirationTtl: Math.ceil((endOfDay - now) / 1000) }),
  ]);
}

function verificationEmailHtml(username, verifyUrl) {
  return `<!DOCTYPE html><html><body style="background:#0b0b0b;color:#eeeeee;font-family:sans-serif;padding:48px 24px;max-width:480px;margin:0 auto;">
<p style="color:#9a9a9a;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:24px;">FilmStocks</p>
<h2 style="font-size:22px;font-weight:600;margin-bottom:10px;">Verify your email</h2>
<p style="color:#9a9a9a;margin-bottom:32px;">Hi ${username}, click the button below to confirm your email address and activate your account.</p>
<a href="${verifyUrl}" style="display:inline-block;background:#eeeeee;color:#0b0b0b;text-decoration:none;padding:13px 28px;border-radius:6px;font-weight:600;font-size:15px;">Verify email address</a>
<p style="color:#555;font-size:13px;margin-top:32px;">This link expires in 24 hours. If you didn't create a FilmStocks account, you can safely ignore this email.</p>
<p style="color:#444;font-size:12px;margin-top:8px;word-break:break-all;">Or copy: ${verifyUrl}</p>
</body></html>`;
}

async function getUserById(env, id) {
  return env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(id).first();
}

function safeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    auth_provider: user.auth_provider,
    role: user.role,
    avatar_url: user.avatar_url,
    email_verified: !!user.email_verified,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

async function uniqueUsername(env, seed) {
  const base = String(seed).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 42) || 'filmuser';
  let candidate = base;
  let suffix = 1;
  while (await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(candidate).first()) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${base64url(salt)}$${base64url(new Uint8Array(bits))}`;
}

async function verifyPassword(password, hash) {
  const parts = String(hash).split('$');
  if (parts[0] !== 'pbkdf2') return false;
  const hasEmbeddedIterations = parts.length === 4;
  const iterations = hasEmbeddedIterations ? Number(parts[1]) : PBKDF2_ITERATIONS;
  const salt64 = parts[hasEmbeddedIterations ? 2 : 1];
  const expected = parts[hasEmbeddedIterations ? 3 : 2];
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > PBKDF2_ITERATIONS) return false;
  const salt = base64urlDecode(salt64);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return timingSafeEqual(new Uint8Array(bits), base64urlDecode(expected));
}

async function signJwt(payload, env) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + 60 * 60 * 24 * 7 };
  const unsigned = `${base64urlJson(header)}.${base64urlJson(body)}`;
  const signature = await hmac(unsigned, jwtSecret(env));
  return `${unsigned}.${signature}`;
}

async function verifyJwt(token, env) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const parsedHeader = JSON.parse(new TextDecoder().decode(base64urlDecode(header)));
    if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') return null;
    if (!(await verifyHmac(`${header}.${body}`, signature, jwtSecret(env)))) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)));
    if (!Number.isInteger(payload.id) || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64url(new Uint8Array(signature));
}

async function verifyHmac(value, signature, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, base64urlDecode(signature), new TextEncoder().encode(value));
}

function timingSafeEqual(left, right) {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...jsonHeaders, ...headers } });
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request, env)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== env.CLIENT_ORIGIN) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
    'vary': 'Origin',
  };
}

function preflight(request, env) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== env.CLIENT_ORIGIN) return new Response(null, { status: 403 });
  return withSecurityHeaders(new Response(null, { status: 204, headers: corsHeaders(request, env) }));
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(self)');
  headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
  return new Response(response.body, { status: response.status, headers });
}

function assertJwtSecret(env) {
  jwtSecret(env);
}

function jwtSecret(env) {
  const secret = String(env.JWT_SECRET || '');
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw Object.assign(new Error('Server authentication is not configured'), { status: 503 });
  }
  return secret;
}

function maxUploadBytes(env) {
  const configured = Number(env.MAX_UPLOAD_BYTES || 10485760);
  return Number.isFinite(configured) && configured > 0 ? configured : 10485760;
}

function assertBodySize(request, maxBytes) {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) {
    throw Object.assign(new Error('Request body is too large'), { status: 413 });
  }
}

async function readJson(request) {
  assertBodySize(request, JSON_BODY_LIMIT_BYTES);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > JSON_BODY_LIMIT_BYTES) {
    throw Object.assign(new Error('Request body is too large'), { status: 413 });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 });
  }
}

async function enforceRateLimit(limiter, key, message) {
  if (!limiter) {
    console.warn('Rate limiter binding missing:', key);
    return;
  }
  try {
    const { success } = await limiter.limit({ key });
    if (!success) throw Object.assign(new Error(message), { status: 429 });
  } catch (err) {
    if (err.status === 429) throw err;
    // Rate limiter infrastructure error — log and allow through rather than blocking all traffic.
    console.warn('Rate limiter error (allowing request through):', key, err?.message);
  }
}

function rateLimitKey(request, scope) {
  return `${scope}:${request.headers.get('cf-connecting-ip') || 'anonymous'}`;
}

async function validateImageFile(file, maxBytes) {
  if (!file.size) throw Object.assign(new Error('Image file is empty'), { status: 422 });
  if (file.size > maxBytes) throw Object.assign(new Error(`Upload is too large. Max size is ${maxBytes} bytes`), { status: 413 });

  const contentType = String(file.type || '').toLowerCase();
  const mimeExt = Object.entries(IMAGE_TYPES).find(([, type]) => type === contentType)?.[0];
  const nameExt = String(file.name || '').split('.').pop()?.toLowerCase();
  const normalizedNameExt = nameExt === 'jpeg' ? 'jpg' : nameExt;
  if (!mimeExt || (normalizedNameExt && normalizedNameExt !== mimeExt)) {
    throw Object.assign(new Error('Only jpg, png, webp, and gif image files are allowed'), { status: 422 });
  }

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasImageSignature(bytes, mimeExt)) {
    throw Object.assign(new Error('Uploaded file content does not match its image type'), { status: 422 });
  }
  return { ext: mimeExt, contentType };
}

function hasImageSignature(bytes, ext) {
  if (ext === 'jpg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === 'png') return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  if (ext === 'gif') return ['GIF87a', 'GIF89a'].includes(String.fromCharCode(...bytes.slice(0, 6)));
  if (ext === 'webp') {
    return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}

function base64urlJson(data) {
  return base64url(new TextEncoder().encode(JSON.stringify(data)));
}

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
