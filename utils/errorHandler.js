const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

// Initialize Sentry for error tracking
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}

class ErrorHandler {
  static handle(error, req, res, next) {
    // Log error with Winston
    logger.error('Error occurred:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
    });

    // Send error to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        user: req.user ? { id: req.user.id, email: req.user.email } : null,
        request: {
          url: req.url,
          method: req.method,
          headers: req.headers,
          body: req.body,
        },
      });
    }

    // Determine error type and status code
    let statusCode = 500;
    let message = 'Internal Server Error';
    let details = {};

    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation Error';
      details = error.details;
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format';
    } else if (error.code === 11000) {
      statusCode = 409;
      message = 'Duplicate entry';
      details = { field: Object.keys(error.keyValue)[0] };
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    } else if (error.name === 'UnauthorizedError') {
      statusCode = 401;
      message = 'Unauthorized';
    } else if (error.name === 'ForbiddenError') {
      statusCode = 403;
      message = 'Forbidden';
    } else if (error.name === 'NotFoundError') {
      statusCode = 404;
      message = 'Resource not found';
    } else if (error.name === 'RateLimitError') {
      statusCode = 429;
      message = 'Too many requests';
    }

    // Send error response
    res.status(statusCode).json({
      success: false,
      error: {
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        ...(Object.keys(details).length > 0 && { details }),
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }

  static async handleAsync(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  static logError(error, context = {}) {
    logger.error('Application Error:', {
      error: error.message,
      stack: error.stack,
      ...context,
    });

    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        extra: context,
      });
    }
  }

  static logInfo(message, context = {}) {
    logger.info(message, context);
  }

  static logWarning(message, context = {}) {
    logger.warn(message, context);
  }
}

module.exports = ErrorHandler;