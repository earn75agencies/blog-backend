/**
 * Response utility
 * Provides standardized API response functions
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    status: 'success',
    message,
  };

  if (data !== null) {
    if (Array.isArray(data)) {
      response.results = data.length;
      response.data = { items: data };
    } else if (typeof data === 'object' && data.pagination) {
      // Data already includes pagination
      response.results = data.results || 0;
      response.pagination = data.pagination;
      response.data = data.data || data;
    } else {
      response.data = data;
    }
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} errors - Additional error details
 */
const error = (res, message = 'Error', statusCode = 500, errors = null) => {
  const response = {
    status: 'error',
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} items - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 */
const paginated = (res, items, page, limit, total, message = 'Success') => {
  const pages = Math.ceil(total / limit);

  return res.json({
    status: 'success',
    message,
    results: items.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
    data: {
      items,
    },
  });
};

/**
 * Send created response
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 */
const created = (res, data, message = 'Resource created successfully') => {
  return success(res, data, message, 201);
};

/**
 * Send no content response
 * @param {Object} res - Express response object
 */
const noContent = (res) => {
  return res.status(204).send();
};

/**
 * Send unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 401);
};

/**
 * Send forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const forbidden = (res, message = 'Forbidden') => {
  return error(res, message, 403);
};

/**
 * Send not found response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404);
};

/**
 * Send bad request response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {*} errors - Validation errors
 */
const badRequest = (res, message = 'Bad request', errors = null) => {
  return error(res, message, 400, errors);
};

/**
 * Send conflict response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const conflict = (res, message = 'Resource conflict') => {
  return error(res, message, 409);
};

/**
 * Send too many requests response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const tooManyRequests = (res, message = 'Too many requests') => {
  return error(res, message, 429);
};

/**
 * Send internal server error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const serverError = (res, message = 'Internal server error') => {
  return error(res, message, 500);
};

module.exports = {
  success,
  error,
  paginated,
  created,
  noContent,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  conflict,
  tooManyRequests,
  serverError,
};

