/**
 * Request ID Middleware
 * Adds unique request ID to each request for tracking and debugging
 */

const { v4: uuidv4 } = require('uuid');

const requestIdMiddleware = (req, res, next) => {
  // Generate or use existing request ID
  req.id = req.headers['x-request-id'] || uuidv4();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);
  
  next();
};

module.exports = requestIdMiddleware;



