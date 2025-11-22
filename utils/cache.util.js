const NodeCache = require('node-cache');

// Create cache instance with improved configuration
const cache = new NodeCache({
  stdTTL: 300, // Default TTL: 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Better performance for large objects
  maxKeys: 10000, // Limit cache size to prevent memory issues
  deleteOnExpire: true, // Automatically delete expired keys
});

/**
 * Cache utility functions
 */
class CacheUtil {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  static get(key) {
    return cache.get(key);
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  static set(key, value, ttl = 300) {
    return cache.set(key, value, ttl);
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  static del(key) {
    return cache.del(key);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  static has(key) {
    return cache.has(key);
  }

  /**
   * Clear all cache
   */
  static flush() {
    return cache.flushAll();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  static getStats() {
    return cache.getStats();
  }

  /**
   * Cache middleware for Express
   * @param {number} ttl - Time to live in seconds
   * @param {Function} keyGenerator - Custom key generator function
   */
  static middleware(ttl = 300, keyGenerator = null) {
    return (req, res, next) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip caching if user is authenticated (for personalized content)
      if (req.user && keyGenerator === null) {
        return next();
      }

      const key = keyGenerator 
        ? keyGenerator(req)
        : `${req.method}:${req.originalUrl || req.url}`;

      // Try to get from cache
      const cached = this.get(key);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = (body) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.set(key, body, ttl);
        }
        res.set('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    };
  }

  /**
   * Delete cache by pattern (supports wildcards)
   * @param {string} pattern - Pattern to match keys
   */
  static delPattern(pattern) {
    const keys = cache.keys();
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deleted = 0;
    
    keys.forEach(key => {
      if (regex.test(key)) {
        cache.del(key);
        deleted++;
      }
    });
    
    return deleted;
  }
}

module.exports = CacheUtil;

