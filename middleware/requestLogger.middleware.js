const logger = require('../utils/logger.util');

/**
 * Request logger middleware
 * Logs all incoming requests with detailed information
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    contentType: req.get('content-type'),
    contentLength: req.get('content-length'),
    timestamp: new Date().toISOString(),
  });

  // Log request body (excluding sensitive fields)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    
    // Remove sensitive fields from logs
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];
    sensitiveFields.forEach((field) => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '***REDACTED***';
      }
    });

    logger.debug('Request body', sanitizedBody);
  }

  // Log query parameters
  if (req.query && Object.keys(req.query).length > 0) {
    logger.debug('Query parameters', req.query);
  }

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString(),
    });

    // Log error if status code is 4xx or 5xx
    if (res.statusCode >= 400) {
      logger.warn('Request error', {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        ip: req.ip || req.connection.remoteAddress,
      });
    }
  });

  next();
};

module.exports = requestLogger;

