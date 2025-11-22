/**
 * Cache Headers Middleware
 * Sets appropriate cache headers for different response types
 */

const cacheHeaders = (req, res, next) => {
  // Skip caching for authenticated requests
  if (req.user) {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    return next();
  }

  // Static assets - long cache
  if (req.path.match(/\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    return next();
  }

  // API responses - short cache
  if (req.path.startsWith('/api/')) {
    const cacheTime = 60; // 1 minute for public API responses
    
    // Longer cache for read-only endpoints
    if (['GET'].includes(req.method)) {
      if (req.path.includes('/categories') || req.path.includes('/tags')) {
        res.set({
          'Cache-Control': `public, max-age=${cacheTime * 10}`, // 10 minutes
          'ETag': `"${Date.now()}"`,
        });
      } else {
        res.set({
          'Cache-Control': `public, max-age=${cacheTime}`,
          'ETag': `"${Date.now()}"`,
        });
      }
    } else {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });
    }
  }

  next();
};

module.exports = cacheHeaders;

