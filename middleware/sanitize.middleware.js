const { sanitizeInput } = require('../utils/sanitize.util');

/**
 * Sanitization middleware
 * Automatically sanitizes request body, query, and params
 */
const sanitize = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (req.query.hasOwnProperty(key)) {
        const value = req.query[key];
        if (typeof value === 'string') {
          req.query[key] = sanitizeInput(value);
        }
      }
    }
  }

  // Sanitize route parameters
  if (req.params && typeof req.params === 'object') {
    for (const key in req.params) {
      if (req.params.hasOwnProperty(key)) {
        const value = req.params[key];
        if (typeof value === 'string') {
          req.params[key] = sanitizeInput(value);
        }
      }
    }
  }

  next();
};

module.exports = sanitize;

