const memoryCache = new Map();

export function publicCache(seconds = 300) {
  return (req, res, next) => {
    if (req.method !== 'GET' || req.headers.authorization) return next();

    const key = req.originalUrl;
    const cached = memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      res.set(cached.headers);
      return res.status(cached.status).json(cached.body);
    }

    const originalJson = res.json.bind(res);
    res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
    res.json = body => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(key, {
          body,
          status: res.statusCode,
          headers: { 'Cache-Control': res.get('Cache-Control') },
          expires: Date.now() + seconds * 1000,
        });
      }
      return originalJson(body);
    };

    next();
  };
}
