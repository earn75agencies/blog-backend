/**
 * Request Timeout Middleware
 * Prevents requests from hanging indefinitely
 */

const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    // Set timeout
    req.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(408).json({
          status: 'error',
          message: 'Request timeout. Please try again.',
        });
      }
    });

    // Set response timeout
    res.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(408).json({
          status: 'error',
          message: 'Response timeout. Please try again.',
        });
      }
    });

    next();
  };
};

module.exports = requestTimeout;

