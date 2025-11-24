const NodeCache = require('node-cache');
const redisService = require('./redis/redis.service');

// In-memory cache for fallback
const memoryCache = new NodeCache({
  stdTTL: 600, // 10 minutes default TTL
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false,
});

class CacheService {
  constructor() {
    this.redisAvailable = false;
    this.init();
  }

  async init() {
    try {
      // Check if Redis is available
      this.redisAvailable = await redisService.ensureConnection();
      if (this.redisAvailable) {
        console.log('✅ Cache service initialized with Redis');
      } else {
        console.log('⚠️ Redis unavailable, using memory cache only');
      }
    } catch (error) {
      console.warn('⚠️ Redis initialization failed, using memory cache only:', error.message);
      this.redisAvailable = false;
    }
  }

  // Get value from cache
  async get(key) {
    try {
      if (this.redisAvailable) {
        return await redisService.get(key);
      } else {
        return memoryCache.get(key);
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set value in cache
  async set(key, value, ttl = 600) {
    try {
      if (this.redisAvailable) {
        return await redisService.set(key, value, ttl);
      } else {
        memoryCache.set(key, value, ttl);
        return true;
      }
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete value from cache
  async del(key) {
    try {
      if (this.redisAvailable) {
        return await redisService.del(key);
      } else {
        memoryCache.del(key);
        return true;
      }
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Clear all cache
  async clear() {
    try {
      if (this.redisAvailable) {
        // Upstash Redis doesn't support flushDb, use pattern deletion
        return await redisService.deletePattern('*');
      } else {
        memoryCache.flushAll();
        return true;
      }
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  // Get multiple values
  async mget(keys) {
    try {
      if (this.redisAvailable) {
        return await redisService.mget(keys);
      } else {
        return keys.map(key => memoryCache.get(key));
      }
    } catch (error) {
      console.error('Cache mget error:', error);
      return [];
    }
  }

  // Set multiple values
  async mset(keyValuePairs, ttl = 600) {
    try {
      if (this.redisAvailable) {
        return await redisService.mset(keyValuePairs, ttl);
      } else {
        for (const [key, value] of keyValuePairs) {
          memoryCache.set(key, value, ttl);
        }
        return true;
      }
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  // Increment counter
  async incr(key, by = 1) {
    try {
      if (this.redisAvailable) {
        // Redis service doesn't have incr, implement using get/set
        const current = await redisService.get(key) || 0;
        const newValue = current + by;
        await redisService.set(key, newValue);
        return newValue;
      } else {
        const current = memoryCache.get(key) || 0;
        const newValue = current + by;
        memoryCache.set(key, newValue);
        return newValue;
      }
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      if (this.redisAvailable) {
        return await redisService.exists(key);
      } else {
        return memoryCache.has(key);
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Set expiration for existing key
  async expire(key, ttl) {
    try {
      if (this.redisAvailable) {
        // Redis service doesn't support expire directly
        // Get the value and set it again with TTL
        const value = await redisService.get(key);
        if (value) {
          return await redisService.set(key, value, ttl);
        }
        return false;
      } else {
        // NodeCache doesn't support setting expiration for existing keys
        const value = memoryCache.get(key);
        if (value) {
          memoryCache.set(key, value, ttl);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  // Get cache statistics
  async getStats() {
    try {
      if (this.redisAvailable) {
        const isHealthy = await redisService.ping();
        return { type: 'redis', healthy: isHealthy };
      } else {
        const stats = memoryCache.getStats();
        return { type: 'memory', stats };
      }
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }
}

// Cache middleware factory
const cacheMiddleware = (keyPrefix, ttl = 600) => {
  return async (req, res, next) => {
    const cacheKey = `${keyPrefix}:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    try {
      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }
      
      // Override res.json to cache response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200) {
          cacheService.set(cacheKey, data, ttl);
        }
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Invalidate cache middleware
const invalidateCache = (keyPatterns) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = async function(data) {
      // Invalidate cache patterns after successful operation
      if (res.statusCode < 300) {
        for (const pattern of keyPatterns) {
          try {
            if (cacheService.redisAvailable) {
              await redisService.deletePattern(pattern);
            } else {
              // For memory cache, flush all
              memoryCache.flushAll();
            }
          } catch (error) {
            console.error('Cache invalidation error:', error);
          }
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

const cacheService = new CacheService();

module.exports = {
  cacheService,
  cacheMiddleware,
  invalidateCache,
};