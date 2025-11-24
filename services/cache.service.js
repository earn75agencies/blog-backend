const Redis = require('redis');
const NodeCache = require('node-cache');

// Redis client for distributed caching
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis server connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  },
});

redisClient.on('error', (err) => {
  console.error('Redis Cache Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis Cache Connected');
});

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
      await redisClient.connect();
      this.redisAvailable = true;
      console.log('✅ Cache service initialized with Redis');
    } catch (error) {
      console.warn('⚠️ Redis unavailable, using memory cache only:', error.message);
      this.redisAvailable = false;
    }
  }

  // Get value from cache
  async get(key) {
    try {
      if (this.redisAvailable) {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
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
      const serializedValue = JSON.stringify(value);
      
      if (this.redisAvailable) {
        await redisClient.setEx(key, ttl, serializedValue);
      } else {
        memoryCache.set(key, value, ttl);
      }
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete value from cache
  async del(key) {
    try {
      if (this.redisAvailable) {
        await redisClient.del(key);
      } else {
        memoryCache.del(key);
      }
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Clear all cache
  async clear() {
    try {
      if (this.redisAvailable) {
        await redisClient.flushDb();
      } else {
        memoryCache.flushAll();
      }
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  // Get multiple values
  async mget(keys) {
    try {
      if (this.redisAvailable) {
        const values = await redisClient.mGet(keys);
        return values.map(value => value ? JSON.parse(value) : null);
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
        const pipeline = redisClient.multi();
        for (const [key, value] of keyValuePairs) {
          pipeline.setEx(key, ttl, JSON.stringify(value));
        }
        await pipeline.exec();
      } else {
        for (const [key, value] of keyValuePairs) {
          memoryCache.set(key, value, ttl);
        }
      }
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  // Increment counter
  async incr(key, by = 1) {
    try {
      if (this.redisAvailable) {
        return await redisClient.incrBy(key, by);
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
        return await redisClient.exists(key);
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
        return await redisClient.expire(key, ttl);
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
        const info = await redisClient.info('memory');
        return { type: 'redis', info };
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
      
      // Override res.json to cache the response
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
              const keys = await redisClient.keys(pattern);
              if (keys.length > 0) {
                await redisClient.del(keys);
              }
            } else {
              // For memory cache, we need to track keys differently
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