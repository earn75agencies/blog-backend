/**
 * Request Timeout Middleware
 * Prevents requests from hanging indefinitely
 */

const timeout = (ms = 30000) => {
  return (req, res, next) => {
    // Set timeout
    req.setTimeout(ms, () => {
      if (!res.headersSent) {
        res.status(408).json({
          status: 'error',
          message: 'Request timeout',
        });
      }
    });

    next();
  };
};

/**
 * Async timeout wrapper
 * Wraps async functions with timeout
 */
const withTimeout = (fn, ms = 10000) => {
  return async (...args) => {
    return Promise.race([
      fn(...args),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), ms)
      ),
    ]);
  };
};

module.exports = {
  timeout,
  withTimeout,
};

