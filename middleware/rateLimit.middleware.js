/**
 * Rate Limiting Middleware
 * Soft caps for cost control (not security)
 * Configurable per user plan
 */

const rateLimit = require('express-rate-limit');
const redisService = require('../services/redis/redis.service');

/**
 * Create rate limiter with Redis store
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // Max requests per window
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => {
      // Default: use IP address
      return req.ip || req.connection.remoteAddress;
    },
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    // Use Redis store for distributed rate limiting
    store: {
      async incr(key, cb) {
        try {
          const count = await redisService.client.incr(`ratelimit:${key}`);
          if (count === 1) {
            await redisService.client.expire(`ratelimit:${key}`, Math.ceil(windowMs / 1000));
          }
          cb(null, { totalHits: count });
        } catch (error) {
          cb(error);
        }
      },
      async decrement(key) {
        await redisService.client.decr(`ratelimit:${key}`);
      },
      async resetKey(key) {
        await redisService.client.del(`ratelimit:${key}`);
      },
    },
    keyGenerator,
  });
}

/**
 * Upload rate limiter (stricter limits)
 */
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Upload limit exceeded. Please try again later.',
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? `upload:${req.user._id}` : `upload:${req.ip}`;
  },
});

/**
 * API rate limiter (general)
 */
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: 'API rate limit exceeded. Please try again later.',
});

/**
 * Search rate limiter
 */
const searchLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Search rate limit exceeded. Please slow down.',
});

/**
 * Create plan-based rate limiter
 */
function createPlanBasedLimiter(planLimits = {}) {
  return async (req, res, next) => {
    // Get user's plan (default to 'free')
    const userPlan = req.user?.plan || 'free';
    const limits = planLimits[userPlan] || planLimits.free || { max: 100, windowMs: 15 * 60 * 1000 };

    const limiter = createRateLimiter({
      ...limits,
      keyGenerator: (req) => {
        return req.user ? `plan:${userPlan}:${req.user._id}` : `plan:free:${req.ip}`;
      },
    });

    return limiter(req, res, next);
  };
}

/**
 * File size limiter middleware
 */
function fileSizeLimiter(maxSize = 50 * 1024 * 1024) { // Default 50MB
  return (req, res, next) => {
    if (req.file && req.file.size > maxSize) {
      return res.status(413).json({
        status: 'error',
        message: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      });
    }

    // Check multiple files
    if (req.files) {
      const oversizedFiles = req.files.filter(file => file.size > maxSize);
      if (oversizedFiles.length > 0) {
        return res.status(413).json({
          status: 'error',
          message: `One or more files exceed maximum allowed size of ${maxSize / 1024 / 1024}MB`,
          files: oversizedFiles.map(f => f.originalname),
        });
      }
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  uploadLimiter,
  apiLimiter,
  searchLimiter,
  createPlanBasedLimiter,
  fileSizeLimiter,
};



