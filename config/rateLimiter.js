const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');
const config = require('./index');

// Create Redis client for rate limiting
const redisClient = Redis.createClient({
  url: config.REDIS_URL,
  password: config.REDIS_PASSWORD,
});

redisClient.on('error', (err) => {
  console.error('Redis rate limiter error:', err);
});

// General API rate limiter
const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: parseInt(config.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(config.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(config.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

// Strict rate limiter for sensitive endpoints
const strictLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(config.STRICT_RATE_LIMIT_MAX) || 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many attempts from this IP, please try again later.',
    retryAfter: 900, // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiter
const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900,
  },
  skipSuccessfulRequests: true,
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
    retryAfter: 3600,
  },
});

// Content creation rate limiter
const contentCreationLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each user to 10 content creations per minute
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  message: {
    error: 'Too many content creations, please slow down.',
    retryAfter: 60,
  },
});

// File upload rate limiter
const uploadLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each user to 20 uploads per minute
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  message: {
    error: 'Too many file uploads, please slow down.',
    retryAfter: 60,
  },
});

// API key rate limiter for external APIs
const apiKeyLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // limit each API key to 1000 requests per minute
  keyGenerator: (req) => {
    return req.get('X-API-Key') || req.ip;
  },
  message: {
    error: 'API rate limit exceeded.',
    retryAfter: 60,
  },
});

module.exports = {
  generalLimiter,
  strictLimiter,
  authLimiter,
  passwordResetLimiter,
  contentCreationLimiter,
  uploadLimiter,
  apiKeyLimiter,
};