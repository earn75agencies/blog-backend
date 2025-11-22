/**
 * Redis Service for Caching and Sessions
 * Supports unlimited scalability with Redis
 * Gracefully handles Redis unavailability (app continues without caching)
 */

const Redis = require('ioredis');

class RedisService {
  constructor() {
    this.client = null;
    this.sessionClient = null;
    this.isEnabled = process.env.REDIS_ENABLED !== 'false'; // Default to true, set REDIS_ENABLED=false to disable
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;

    if (this.isEnabled) {
      this.initializeConnections();
    } else {
      console.log('ℹ️  Redis is disabled (REDIS_ENABLED=false)');
    }
  }

  initializeConnections() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true, // Don't connect immediately
        retryStrategy: (times) => {
          // Stop retrying after max attempts
          if (times > this.maxConnectionAttempts) {
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          // Only reconnect on specific errors
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
        db: process.env.REDIS_SESSION_DB || 1, // Separate DB for sessions
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true, // Don't connect immediately
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
      });

      this.setupEventHandlers();
      
      // Attempt to connect (but don't block if it fails)
      // Use a timeout to prevent immediate connection attempts that spam errors
      setTimeout(() => {
        if (this.isEnabled) {
          this.connect().catch(() => {
            // Connection failed, will be handled by error handlers
            // After max attempts, Redis will be disabled
          });
        }
      }, 1000); // Delay initial connection attempt by 1 second
    } catch (error) {
      console.warn('⚠️  Redis initialization error:', error.message);
      console.warn('⚠️  App will continue without Redis caching.');
      this.isEnabled = false;
    }
  }

  async connect() {
    if (!this.isEnabled || this.isConnected) return;
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      // Already exceeded max attempts, don't try again
      return;
    }

    try {
      // Set connection timeout
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
      console.log('✅ Redis connected successfully');
    } catch (error) {
      this.connectionAttempts++;
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.warn('⚠️  Redis connection failed after max attempts. App will continue without Redis.');
        this.isEnabled = false;
        // Disable automatic reconnection attempts
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
    if (!this.client || !this.sessionClient) return;

    this.client.on('connect', () => {
      console.log('✅ Redis connected');
      this.isConnected = true;
      this.connectionAttempts = 0; // Reset on successful connection
    });

    this.client.on('error', (err) => {
      // Suppress all errors if Redis is disabled or max attempts exceeded
      if (!this.isEnabled || this.connectionAttempts >= this.maxConnectionAttempts) {
        return; // Silently ignore errors after max attempts
      }
      
      // Only log the first connection error to reduce noise
      if (this.connectionAttempts === 0) {
        console.error('❌ Redis error:', err.message);
      }
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });

    this.sessionClient.on('connect', () => {
      console.log('✅ Redis session client connected');
    });

    this.sessionClient.on('error', (err) => {
      // Suppress all errors if Redis is disabled or max attempts exceeded
      if (!this.isEnabled || this.connectionAttempts >= this.maxConnectionAttempts) {
        return; // Silently ignore errors after max attempts
      }
      
      // Only log the first connection error to reduce noise
      if (this.connectionAttempts === 0) {
        console.error('❌ Redis session error:', err.message);
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
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
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
      await this.sessionClient.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Redis session set error:', error);
      return false;
    }
  }

  async getSession(sessionId) {
    try {
      const value = await this.sessionClient.get(`session:${sessionId}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis session get error:', error);
      return null;
    }
  }

  async deleteSession(sessionId) {
    try {
      await this.sessionClient.del(`session:${sessionId}`);
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

  // Batch operations
  async mget(keys) {
    try {
      const values = await this.client.mget(...keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      console.error('Redis mget error:', error);
      return [];
    }
  }

  async mset(keyValuePairs, ttl = 3600) {
    try {
      const pipeline = this.client.pipeline();
      for (const [key, value] of Object.entries(keyValuePairs)) {
        pipeline.setex(key, ttl, JSON.stringify(value));
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis mset error:', error);
      return false;
    }
  }

  // Pattern-based deletion
  async deletePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Redis delete pattern error:', error);
      return 0;
    }
  }

  // Health check
  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  // Close connections
  async close() {
    await this.client.quit();
    await this.sessionClient.quit();
  }
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;


