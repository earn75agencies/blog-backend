/**
 * CORS middleware with advanced configuration
 * Handles cross-origin resource sharing
 */

/**
 * CORS middleware factory
 * @param {Object} options - CORS options
 * @returns {Function} CORS middleware
 */
const corsMiddleware = (options = {}) => {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400, // 24 hours
  } = options;

  return (req, res, next) => {
    // Get origin from request
    const requestOrigin = req.headers.origin;

    // Set Access-Control-Allow-Origin
    if (origin === '*') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (typeof origin === 'function') {
      const allowedOrigin = origin(requestOrigin);
      if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      }
    } else if (Array.isArray(origin)) {
      if (origin.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      }
    } else if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Set Access-Control-Allow-Methods
    if (methods && methods.length > 0) {
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    }

    // Set Access-Control-Allow-Headers
    if (allowedHeaders && allowedHeaders.length > 0) {
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    }

    // Set Access-Control-Expose-Headers
    if (exposedHeaders && exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }

    // Set Access-Control-Allow-Credentials
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Set Access-Control-Max-Age
    if (maxAge) {
      res.setHeader('Access-Control-Max-Age', maxAge.toString());
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  };
};

module.exports = corsMiddleware;

