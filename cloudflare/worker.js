const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' };
const PBKDF2_ITERATIONS = 100000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(env) });

    try {
      if (url.pathname.startsWith('/uploads/')) return serveUpload(url, env);
      if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

      const response = await routeApi(request, env, url);
      return withCors(response, env);
    } catch (err) {
      console.error(err);
      return withCors(json({ message: err.message || 'Internal server error' }, err.status || 500), env);
    }
  },
};

async function routeApi(request, env, url) {
  const path = url.pathname.replace(/^\/api/, '');
  const method = request.method;

  if (path === '/health') return json({ ok: true });

  if (method === 'POST' && path === '/auth/register') return register(request, env);
  if (method === 'POST' && path === '/auth/login') return login(request, env);
  if (method === 'POST' && path === '/auth/google') return googleLogin(request, env);
  if (method === 'GET' && path === '/auth/me') return authMe(request, env);

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
  const photoDeleteMatch = path.match(/^\/photos\/(\d+)$/);
  if (method === 'DELETE' && photoDeleteMatch) return deletePhoto(request, env, photoDeleteMatch[1]);

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
  if (method === 'GET' && path === '/admin/users') return adminUsers(request, env);
  const adminUserMatch = path.match(/^\/admin\/users\/(\d+)$/);
  const adminRoleMatch = path.match(/^\/admin\/users\/(\d+)\/role$/);
  if (method === 'PUT' && adminRoleMatch) return adminRole(request, env, adminRoleMatch[1]);
  if (method === 'DELETE' && adminUserMatch) return adminDeleteUser(request, env, adminUserMatch[1]);

  return json({ message: 'Not found' }, 404);
}

async function register(request, env) {
  const body = await request.json();
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
  const result = await env.DB.prepare(`
    INSERT INTO users (username, email, password_hash, auth_provider)
    VALUES (?, ?, ?, 'local')
  `).bind(username, email, passwordHash).run();
  const user = await getUserById(env, result.meta.last_row_id);
  return json(await authPayload(user, env), 201);
}

async function login(request, env) {
  const body = await request.json();
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
  const { credential } = await request.json();
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
        INSERT INTO users (username, email, google_id, auth_provider, avatar_url)
        VALUES (?, ?, ?, 'google', ?)
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
    SELECT p.*, u.username, u.avatar_url, ${likedSelect}
    FROM photos p
    JOIN users u ON u.id = p.user_id
    WHERE p.film_stock_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...binds).all();
  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM photos WHERE film_stock_id = ?').bind(filmStockId).first();
  return json({ data: results, pagination: { page, limit, total: count.total, hasMore: offset + results.length < count.total } });
}

async function createPhoto(request, env) {
  const user = await requireUser(request, env);
  const form = await request.formData();
  const file = form.get('image');
  const filmStockId = form.get('filmStockId');
  if (!file || typeof file === 'string') return json({ message: 'Image file is required' }, 400);
  if (!filmStockId) return json({ message: 'Film stock ID required' }, 422);

  const sizeBytes = Number(file.size || 0);
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

  const ext = extensionFor(file);
  const key = `photos/${crypto.randomUUID()}.${ext}`;
  await env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  const imageUrl = `/uploads/${key}`;
  const originalSizeBytes = Number(form.get('originalSizeBytes') || sizeBytes);
  const savedBytes = Math.max(originalSizeBytes - sizeBytes, 0);
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
      original_size_bytes,
      optimized_size_bytes,
      storage_size_bytes,
      storage_saved_bytes,
      variant_count
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    originalSizeBytes,
    sizeBytes,
    sizeBytes,
    savedBytes,
    1
  ).run();
  const photo = await env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(result.meta.last_row_id).first();
  return json(photo, 201);
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
  const body = await request.json();
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
  const body = await request.json();
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
  const body = await request.json();
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
  const body = await request.json();
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

async function adminRole(request, env, id) {
  await requireAdmin(request, env);
  const body = await request.json();
  if (!['user', 'admin'].includes(body.role)) return json({ message: 'Invalid role' }, 422);
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
  const key = decodeURIComponent(url.pathname.replace(/^\/uploads\//, ''));
  const object = await env.PHOTOS.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}

async function maybeStoreCover(form, env) {
  const file = form.get('cover');
  if (!file || typeof file === 'string') return null;
  const ext = extensionFor(file);
  const key = `covers/${crypto.randomUUID()}.${ext}`;
  await env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
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

async function getUserById(env, id) {
  return env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(id).first();
}

function safeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
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
  return `pbkdf2$${base64url(salt)}$${base64url(new Uint8Array(bits))}`;
}

async function verifyPassword(password, hash) {
  const [scheme, salt64, expected] = String(hash).split('$');
  if (scheme !== 'pbkdf2') return false;
  const salt = base64urlDecode(salt64);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, key, 256);
  return base64url(new Uint8Array(bits)) === expected;
}

async function signJwt(payload, env) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + 60 * 60 * 24 * 7 };
  const unsigned = `${base64urlJson(header)}.${base64urlJson(body)}`;
  const signature = await hmac(unsigned, env.JWT_SECRET || 'change-me');
  return `${unsigned}.${signature}`;
}

async function verifyJwt(token, env) {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) return null;
  const expected = await hmac(`${header}.${body}`, env.JWT_SECRET || 'change-me');
  if (expected !== signature) return null;
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64url(new Uint8Array(signature));
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...jsonHeaders, ...headers } });
}

function withCors(response, env) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(env)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
}

function corsHeaders(env) {
  return {
    'access-control-allow-origin': env.CLIENT_ORIGIN || '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
  };
}

function extensionFor(file) {
  const name = file.name || '';
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
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
