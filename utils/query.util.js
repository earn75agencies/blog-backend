/**
 * Query utility functions
 * Provides MongoDB query building utilities
 */

/**
 * Build query from filters
 * @param {Object} filters - Filter object
 * @returns {Object} MongoDB query
 */
const buildQuery = (filters = {}) => {
  const query = {};

  for (const key in filters) {
    if (filters.hasOwnProperty(key) && filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      const value = filters[key];

      // Handle operators
      if (key.startsWith('$')) {
        query[key] = value;
      } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        // Handle object filters like { $gte: 10, $lte: 20 }
        query[key] = value;
      } else if (Array.isArray(value)) {
        // Handle array filters (IN operator)
        if (value.length > 0) {
          query[key] = { $in: value };
        }
      } else {
        // Simple equality
        query[key] = value;
      }
    }
  }

  return query;
};

/**
 * Build search query
 * @param {string} searchTerm - Search term
 * @param {Array<string>} fields - Fields to search in
 * @returns {Object} MongoDB search query
 */
const buildSearchQuery = (searchTerm, fields = []) => {
  if (!searchTerm || fields.length === 0) {
    return {};
  }

  const searchRegex = { $regex: searchTerm, $options: 'i' };
  const orConditions = fields.map((field) => ({ [field]: searchRegex }));

  return { $or: orConditions };
};

/**
 * Build date range query
 * @param {string} field - Date field name
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} MongoDB date range query
 */
const buildDateRangeQuery = (field, startDate, endDate) => {
  const query = {};

  if (startDate && endDate) {
    query[field] = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  } else if (startDate) {
    query[field] = { $gte: new Date(startDate) };
  } else if (endDate) {
    query[field] = { $lte: new Date(endDate) };
  }

  return query;
};

/**
 * Build pagination options
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Pagination options
 */
const buildPaginationOptions = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  return {
    skip: Math.max(0, skip),
    limit: Math.max(1, Math.min(100, limit)),
  };
};

/**
 * Build sort options
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order ('asc' or 'desc')
 * @returns {Object} Sort options
 */
const buildSortOptions = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const order = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  return { [sortBy]: order };
};

/**
 * Build text search query
 * @param {string} searchTerm - Search term
 * @returns {Object} MongoDB text search query
 */
const buildTextSearchQuery = (searchTerm) => {
  if (!searchTerm) {
    return {};
  }

  return { $text: { $search: searchTerm } };
};

/**
 * Build geolocation query
 * @param {string} field - Geo field name
 * @param {number} longitude - Longitude
 * @param {number} latitude - Latitude
 * @param {number} maxDistance - Maximum distance in meters
 * @returns {Object} MongoDB geo query
 */
const buildGeoQuery = (field, longitude, latitude, maxDistance) => {
  if (!longitude || !latitude) {
    return {};
  }

  const query = {
    [field]: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      },
    },
  };

  if (maxDistance) {
    query[field].$near.$maxDistance = maxDistance;
  }

  return query;
};

/**
 * Build projection (field selection)
 * @param {Array<string>|string} fields - Fields to include or exclude
 * @param {boolean} exclude - If true, exclude fields instead of including
 * @returns {Object} MongoDB projection
 */
const buildProjection = (fields, exclude = false) => {
  if (!fields) {
    return {};
  }

  const fieldArray = Array.isArray(fields) ? fields : fields.split(',').map((f) => f.trim());
  const projection = {};

  fieldArray.forEach((field) => {
    if (field) {
      projection[field] = exclude ? 0 : 1;
    }
  });

  return projection;
};

/**
 * Build aggregation pipeline
 * @param {Object} options - Aggregation options
 * @returns {Array} Aggregation pipeline
 */
const buildAggregationPipeline = (options = {}) => {
  const pipeline = [];

  // Match stage
  if (options.match) {
    pipeline.push({ $match: options.match });
  }

  // Lookup stage
  if (options.lookup) {
    if (Array.isArray(options.lookup)) {
      options.lookup.forEach((lookup) => {
        pipeline.push({ $lookup: lookup });
      });
    } else {
      pipeline.push({ $lookup: options.lookup });
    }
  }

  // Project stage
  if (options.project) {
    pipeline.push({ $project: options.project });
  }

  // Group stage
  if (options.group) {
    pipeline.push({ $group: options.group });
  }

  // Sort stage
  if (options.sort) {
    pipeline.push({ $sort: options.sort });
  }

  // Limit stage
  if (options.limit) {
    pipeline.push({ $limit: options.limit });
  }

  // Skip stage
  if (options.skip) {
    pipeline.push({ $skip: options.skip });
  }

  // Facet stage
  if (options.facet) {
    pipeline.push({ $facet: options.facet });
  }

  // Unwind stage
  if (options.unwind) {
    pipeline.push({ $unwind: options.unwind });
  }

  return pipeline;
};

/**
 * Build update query
 * @param {Object} updates - Update operations
 * @param {boolean} upsert - If true, create if not exists
 * @returns {Object} MongoDB update query
 */
const buildUpdateQuery = (updates, upsert = false) => {
  const updateQuery = {};

  for (const key in updates) {
    if (updates.hasOwnProperty(key) && updates[key] !== undefined) {
      const value = updates[key];

      // Handle operators
      if (key.startsWith('$')) {
        updateQuery[key] = value;
      } else {
        // Simple set operation
        if (!updateQuery.$set) {
          updateQuery.$set = {};
        }
        updateQuery.$set[key] = value;
      }
    }
  }

  return {
    update: updateQuery,
    options: { upsert, new: true },
  };
};

/**
 * Build delete query
 * @param {Object} filters - Delete filters
 * @returns {Object} MongoDB delete query
 */
const buildDeleteQuery = (filters = {}) => {
  return buildQuery(filters);
};

module.exports = {
  buildQuery,
  buildSearchQuery,
  buildDateRangeQuery,
  buildPaginationOptions,
  buildSortOptions,
  buildTextSearchQuery,
  buildGeoQuery,
  buildProjection,
  buildAggregationPipeline,
  buildUpdateQuery,
  buildDeleteQuery,
};

