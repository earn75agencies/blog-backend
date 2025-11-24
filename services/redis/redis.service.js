/**
 * Redis Service for Caching and Sessions
 * Supports unlimited scalability with Upstash Redis for production
 * Falls back to local Redis for development
 * Gracefully handles Redis unavailability (app continues without caching)
 */

const { Redis } = process.env.REDIS_TOKEN ? require('@upstash/redis') : { Redis: require('ioredis') };

class RedisService {
  constructor() {
    this.client = null;
    this.sessionClient = null;
    this.isEnabled = process.env.REDIS_ENABLED !== 'false'; // Default to true, set REDIS_ENABLED=false to disable
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.isUpstash = !!process.env.REDIS_TOKEN; // Use Upstash if token is provided

    if (this.isEnabled) {
      this.initializeConnections();
    } else {
      console.log('ℹ️  Redis is disabled (REDIS_ENABLED=false)');
    }
  }

  initializeConnections() {
    try {
      if (this.isUpstash) {
        // Use Upstash Redis for production
        this.client = new Redis({
          url: process.env.REDIS_URL,
          token: process.env.REDIS_TOKEN,
        });

        this.sessionClient = new Redis({
          url: process.env.REDIS_URL,
          token: process.env.REDIS_TOKEN,
        });

        console.log('🚀 Using Upstash Redis for production');
      } else {
        // Use local Redis for development
        this.client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          db: process.env.REDIS_DB || 0,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
          retryStrategy: (times) => {
            if (times > this.maxConnectionAttempts) {
              return null;
            }
            const delay = Math.min(times * 100, 2000);
            return delay;
          },
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              return true;
            }
            return false;
          },
        });

        this.sessionClient = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          db: process.env.REDIS_SESSION_DB || 1,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              return true;
            }
            return false;
          },
        });

        console.log('🏠 Using local Redis for development');
      }

      this.setupEventHandlers();
      
      // Attempt to connect (but don't block if it fails)
      if (!this.isUpstash) {
        // Only add delay for local Redis
        setTimeout(() => {
          if (this.isEnabled) {
            this.connect().catch(() => {
              // Connection failed, will be handled by error handlers
            });
          }
        }, 1000);
      } else {
        // Upstash connects automatically
        this.isConnected = true;
        console.log('✅ Upstash Redis connected successfully');
      }
    } catch (error) {
      console.warn('⚠️  Redis initialization error:', error.message);
      console.warn('⚠️  App will continue without Redis caching.');
      this.isEnabled = false;
    }
  }

  async connect() {
    if (!this.isEnabled || this.isConnected || this.isUpstash) return;
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      return;
    }

    try {
      const connectWithTimeout = (client, timeout = 5000) => {
        return Promise.race([
          client.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), timeout)
          )
        ]);
      };

      await connectWithTimeout(this.client);
      await connectWithTimeout(this.sessionClient);
      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log('✅ Local Redis connected successfully');
    } catch (error) {
      this.connectionAttempts++;
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.warn('⚠️  Local Redis connection failed after max attempts. App will continue without Redis.');
        this.isEnabled = false;
        try {
          this.client.disconnect().catch(() => {});
          this.sessionClient.disconnect().catch(() => {});
        } catch (e) {
          // Ignore disconnect errors
        }
      }
      throw error;
    }
  }

  setupEventHandlers() {
    if (!this.client || !this.sessionClient || this.isUpstash) return;

    this.client.on('connect', () => {
      console.log('✅ Local Redis connected');
      this.isConnected = true;
      this.connectionAttempts = 0;
    });

    this.client.on('error', (err) => {
      if (!this.isEnabled || this.connectionAttempts >= this.maxConnectionAttempts) {
        return;
      }
      
      if (this.connectionAttempts === 0) {
        console.error('❌ Local Redis error:', err.message);
      }
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });

    this.sessionClient.on('connect', () => {
      console.log('✅ Local Redis session client connected');
    });

    this.sessionClient.on('error', (err) => {
      if (!this.isEnabled || this.connectionAttempts >= this.maxConnectionAttempts) {
        return;
      }
      
      if (this.connectionAttempts === 0) {
        console.error('❌ Local Redis session error:', err.message);
      }
    });

    this.sessionClient.on('close', () => {
      // Session client closed
    });
  }

  async ensureConnection() {
    if (!this.isEnabled) return false;
    if (this.isConnected) return true;

    try {
      await this.connect();
      return this.isConnected;
    } catch (error) {
      return false;
    }
  }

  // Cache operations
  async get(key) {
    try {
      if (!this.isEnabled) return null;
      
      let value;
      if (this.isUpstash) {
        value = await this.client.get(key);
      } else {
        value = await this.client.get(key);
      }
      
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      if (!this.isEnabled) return false;
      
      if (this.isUpstash) {
        await this.client.set(key, JSON.stringify(value), { ex: ttl });
      } else {
        await this.client.setex(key, ttl, JSON.stringify(value));
      }
      
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isEnabled) return false;
      
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isEnabled) return false;
      
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  // Session operations
  async setSession(sessionId, data, ttl = 86400) {
    try {
      if (!this.isEnabled) return false;
      
      const key = `session:${sessionId}`;
      if (this.isUpstash) {
        await this.client.set(key, JSON.stringify(data), { ex: ttl });
      } else {
        await this.sessionClient.setex(key, ttl, JSON.stringify(data));
      }
      
      return true;
    } catch (error) {
      console.error('Redis session set error:', error);
      return false;
    }
  }

  async getSession(sessionId) {
    try {
      if (!this.isEnabled) return null;
      
      const key = `session:${sessionId}`;
      let value;
      
      if (this.isUpstash) {
        value = await this.client.get(key);
      } else {
        value = await this.sessionClient.get(key);
      }
      
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis session get error:', error);
      return null;
    }
  }

  async deleteSession(sessionId) {
    try {
      if (!this.isEnabled) return false;
      
      const key = `session:${sessionId}`;
      if (this.isUpstash) {
        await this.client.del(key);
      } else {
        await this.sessionClient.del(key);
      }
      
      return true;
    } catch (error) {
      console.error('Redis session delete error:', error);
      return false;
    }
  }

  // User feed cache
  async cacheUserFeed(userId, posts, ttl = 300) {
    try {
      await this.set(`feed:user:${userId}`, posts, ttl);
      return true;
    } catch (error) {
      console.error('Redis feed cache error:', error);
      return false;
    }
  }

  async getUserFeed(userId) {
    try {
      return await this.get(`feed:user:${userId}`);
    } catch (error) {
      console.error('Redis feed get error:', error);
      return null;
    }
  }

  // Trending posts cache
  async cacheTrendingPosts(posts, ttl = 600) {
    try {
      await this.set('trending:posts', posts, ttl);
      return true;
    } catch (error) {
      console.error('Redis trending cache error:', error);
      return false;
    }
  }

  async getTrendingPosts() {
    try {
      return await this.get('trending:posts');
    } catch (error) {
      console.error('Redis trending get error:', error);
      return null;
    }
  }

  // Category roots cache
  async cacheCategoryRoots(categories, ttl = 600) {
    try {
      await this.set('categories:roots', categories, ttl);
      return true;
    } catch (error) {
      console.error('Redis category cache error:', error);
      return false;
    }
  }

  async getCategoryRoots() {
    try {
      return await this.get('categories:roots');
    } catch (error) {
      console.error('Redis category get error:', error);
      return null;
    }
  }

  // Batch operations (only for local Redis, Upstash doesn't support pipelines)
  async mget(keys) {
    try {
      if (!this.isEnabled) return [];
      
      if (this.isUpstash) {
        // Upstash doesn't support mget, use individual gets
        const promises = keys.map(key => this.get(key));
        return await Promise.all(promises);
      } else {
        const values = await this.client.mget(...keys);
        return values.map(v => v ? JSON.parse(v) : null);
      }
    } catch (error) {
      console.error('Redis mget error:', error);
      return [];
    }
  }

  async mset(keyValuePairs, ttl = 3600) {
    try {
      if (!this.isEnabled) return false;
      
      if (this.isUpstash) {
        // Upstash doesn't support pipelines, use individual sets
        const promises = Object.entries(keyValuePairs).map(([key, value]) => 
          this.set(key, value, ttl)
        );
        await Promise.all(promises);
      } else {
        const pipeline = this.client.pipeline();
        for (const [key, value] of Object.entries(keyValuePairs)) {
          pipeline.setex(key, ttl, JSON.stringify(value));
        }
        await pipeline.exec();
      }
      
      return true;
    } catch (error) {
      console.error('Redis mset error:', error);
      return false;
    }
  }

  // Pattern-based deletion (Upstash doesn't support keys command)
  async deletePattern(pattern) {
    try {
      if (!this.isEnabled) return 0;
      
      if (this.isUpstash) {
        console.warn('⚠️  Pattern deletion not supported with Upstash Redis');
        return 0;
      } else {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
        return keys.length;
      }
    } catch (error) {
      console.error('Redis delete pattern error:', error);
      return 0;
    }
  }

  // Health check
  async ping() {
    try {
      if (!this.isEnabled) return false;
      
      if (this.isUpstash) {
        // Upstash doesn't have ping, just try a simple operation
        await this.client.set('health:check', 'ok', { ex: 10 });
        return true;
      } else {
        const result = await this.client.ping();
        return result === 'PONG';
      }
    } catch (error) {
      return false;
    }
  }

  // Close connections
  async close() {
    try {
      if (this.isUpstash) {
        // Upstash doesn't need explicit closing
        console.log('📴 Upstash Redis connection closed');
      } else {
        await this.client.quit();
        await this.sessionClient.quit();
        console.log('📴 Local Redis connections closed');
      }
    } catch (error) {
      console.error('Error closing Redis connections:', error);
    }
  }
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;