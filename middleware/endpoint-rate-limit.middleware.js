/**
 * Endpoint-Specific Rate Limiting Middleware
 * Different rate limits for different endpoint types
 */

const rateLimit = require('express-rate-limit');

/**
 * Create endpoint-specific rate limiters
 */
const createEndpointLimiters = () => {
  // Strict limits for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'development',
  });

  // Moderate limits for write operations
  const createLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 requests per window
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Standard limits for read operations
  const readLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Very strict for sensitive operations
  const sensitiveOperationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: 'Too many sensitive operations, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Search endpoint limits
  const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 requests per minute
    message: 'Too many search requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Upload endpoint limits
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: 'Upload limit exceeded, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Payment endpoint limits
  const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 payment attempts per hour
    message: 'Too many payment attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Public API limits (permissive for third parties)
  const publicApiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    message: 'Rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
  });

  return {
    authLimiter,
    createLimiter,
    readLimiter,
    sensitiveOperationLimiter,
    searchLimiter,
    uploadLimiter,
    paymentLimiter,
    publicApiLimiter,
  };
};

/**
 * Apply endpoint-specific limiters to express app
 */
const applyEndpointLimiters = (app, limiters) => {
  const {
    authLimiter,
    createLimiter,
    readLimiter,
    searchLimiter,
    uploadLimiter,
    paymentLimiter,
  } = limiters;

  // Auth endpoints - strictest
  app.post('/api/auth/login', authLimiter);
  app.post('/api/auth/register', authLimiter);
  app.post('/api/auth/forgot-password', authLimiter);
  app.post('/api/auth/reset-password', authLimiter);
  app.post('/api/auth/refresh-token', authLimiter);

  // Search endpoints
  app.get('/api/posts/search', searchLimiter);
  app.get('/api/search', searchLimiter);
  app.get('/api/users/search', searchLimiter);

  // Upload endpoints
  app.post('/api/media/upload', uploadLimiter);
  app.post('/api/posts/:id/upload', uploadLimiter);
  app.post('/api/users/avatar/upload', uploadLimiter);

  // Payment endpoints
  app.post('/api/payments/create', paymentLimiter);
  app.post('/api/payments/process', paymentLimiter);

  console.log('✅ Endpoint-specific rate limiters applied');
};

module.exports = {
  createEndpointLimiters,
  applyEndpointLimiters,
};
