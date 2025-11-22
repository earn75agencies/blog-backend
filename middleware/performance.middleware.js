const logger = require('../utils/logger.util');

/**
 * Performance monitoring middleware
 * Tracks and logs slow requests
 */
const performanceMonitor = (thresholdMs = 1000) => {
  return (req, res, next) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    // Log performance when response finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();
      const memoryDelta = {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external,
      };

      const performanceData = {
        method: req.method,
        url: req.originalUrl || req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        memoryDelta: {
          heapUsed: `${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          heapTotal: `${(memoryDelta.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        },
      };

      // Log slow requests
      if (duration > thresholdMs) {
        logger.warn('Slow request detected', performanceData);
      } else {
        logger.debug('Request performance', performanceData);
      }

      // Log high memory usage
      if (memoryDelta.heapUsed > 50 * 1024 * 1024) { // 50MB
        logger.warn('High memory usage detected', performanceData);
      }
    });

    next();
  };
};

/**
 * Response time header middleware
 * Adds X-Response-Time header to responses
 */
const responseTimeHeader = (req, res, next) => {
  const startTime = Date.now();

  // Intercept res.end to set header before response is sent
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Request timeout middleware
 * Kills request if it takes too long
 */
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          status: 'error',
          message: 'Request timeout',
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

module.exports = {
  performanceMonitor,
  responseTimeHeader,
  requestTimeout,
};

