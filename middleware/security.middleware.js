/**
 * Security Middleware
 * Additional security headers and protections
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

/**
 * Enhanced security headers
 */
const securityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for blog content
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
};

/**
 * MongoDB injection protection
 */
const sanitizeMongo = () => {
  return mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`MongoDB injection attempt detected: ${key}`);
    },
  });
};

/**
 * XSS protection
 */
const xssProtection = () => {
  return xss();
};

/**
 * HTTP Parameter Pollution protection
 */
const hppProtection = () => {
  return hpp({
    whitelist: ['category', 'tags', 'sortBy', 'sortOrder'], // Allow these params
  });
};

/**
 * API rate limiter with Redis support
 */
const createApiLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    },
  });
};

/**
 * Strict rate limiter for sensitive operations
 */
const createStrictLimiter = (windowMs = 60 * 60 * 1000, max = 5) => {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
  });
};

module.exports = {
  securityHeaders,
  sanitizeMongo,
  xssProtection,
  hppProtection,
  createApiLimiter,
  createStrictLimiter,
};

