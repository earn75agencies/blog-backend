/**
 * Pagination utility
 * Provides functions for pagination calculations and formatting
 */

/**
 * Calculate pagination metadata
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata
 */
const calculatePagination = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const totalItems = parseInt(total) || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const skip = (currentPage - 1) * itemsPerPage;

  return {
    page: currentPage,
    limit: itemsPerPage,
    total: totalItems,
    pages: totalPages,
    skip,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
  };
};

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {number} maxLimit - Maximum allowed limit
 * @returns {Object} Validated pagination parameters
 */
const validatePagination = (page, limit, maxLimit = 100) => {
  let validPage = parseInt(page) || 1;
  let validLimit = parseInt(limit) || 10;

  // Ensure page is at least 1
  if (validPage < 1) {
    validPage = 1;
  }

  // Ensure limit is between 1 and maxLimit
  if (validLimit < 1) {
    validLimit = 10;
  } else if (validLimit > maxLimit) {
    validLimit = maxLimit;
  }

  return {
    page: validPage,
    limit: validLimit,
  };
};

/**
 * Get pagination query parameters from request
 * @param {Object} req - Express request object
 * @param {number} defaultLimit - Default items per page
 * @param {number} maxLimit - Maximum allowed limit
 * @returns {Object} Pagination parameters
 */
const getPaginationParams = (req, defaultLimit = 10, maxLimit = 100) => {
  const { page, limit } = req.query;
  return validatePagination(page, defaultLimit, maxLimit);
};

/**
 * Format pagination response
 * @param {Array} items - Array of items
 * @param {Object} pagination - Pagination metadata
 * @returns {Object} Formatted response
 */
const formatPaginationResponse = (items, pagination) => {
  return {
    items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev,
      nextPage: pagination.nextPage,
      prevPage: pagination.prevPage,
    },
  };
};

/**
 * Build pagination links
 * @param {Object} req - Express request object
 * @param {Object} pagination - Pagination metadata
 * @returns {Object} Pagination links
 */
const buildPaginationLinks = (req, pagination) => {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
  const query = { ...req.query };

  const links = {
    first: null,
    last: null,
    prev: null,
    next: null,
  };

  if (pagination.hasPrev) {
    query.page = pagination.prevPage;
    links.prev = `${baseUrl}?${new URLSearchParams(query).toString()}`;
  }

  if (pagination.hasNext) {
    query.page = pagination.nextPage;
    links.next = `${baseUrl}?${new URLSearchParams(query).toString()}`;
  }

  query.page = 1;
  links.first = `${baseUrl}?${new URLSearchParams(query).toString()}`;

  query.page = pagination.pages;
  links.last = `${baseUrl}?${new URLSearchParams(query).toString()}`;

  return links;
};

/**
 * Get offset for database query
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {number} Offset value
 */
const getOffset = (page, limit) => {
  const validPage = parseInt(page) || 1;
  const validLimit = parseInt(limit) || 10;
  return (validPage - 1) * validLimit;
};

module.exports = {
  calculatePagination,
  validatePagination,
  getPaginationParams,
  formatPaginationResponse,
  buildPaginationLinks,
  getOffset,
};
