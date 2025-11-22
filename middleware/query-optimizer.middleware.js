/**
 * Query Optimization Middleware
 * Automatically optimizes database queries based on request parameters
 * Implements N+1 query prevention through smart population strategies
 */

/**
 * Generate optimized population strategy based on query parameters
 * Prevents N+1 query problems through intelligent field selection
 */
const generatePopulationStrategy = (model, fields = []) => {
  const strategies = {
    Post: {
      default: [
        { path: 'author', select: 'username avatar firstName lastName' },
        { path: 'category', select: 'name slug' },
        { path: 'tags', select: 'name slug' },
      ],
      withComments: [
        { path: 'author', select: 'username avatar firstName lastName' },
        { path: 'category', select: 'name slug' },
        { path: 'tags', select: 'name slug' },
        {
          path: 'comments',
          select: 'content author createdAt',
          options: { limit: 10, sort: { createdAt: -1 } },
          populate: { path: 'author', select: 'username avatar' },
        },
      ],
      withAuthorDetails: [
        {
          path: 'author',
          select: 'username avatar firstName lastName bio followers',
          populate: { path: 'followers', select: 'username' },
        },
        { path: 'category', select: 'name slug' },
        { path: 'tags', select: 'name slug' },
      ],
    },
    User: {
      default: [
        { path: 'followers', select: 'username avatar', options: { limit: 20 } },
        { path: 'following', select: 'username avatar', options: { limit: 20 } },
      ],
      withPosts: [
        { path: 'followers', select: 'username avatar', options: { limit: 20 } },
        { path: 'following', select: 'username avatar', options: { limit: 20 } },
        {
          path: 'posts',
          select: 'title slug publishedAt',
          options: { limit: 10, sort: { publishedAt: -1 } },
        },
      ],
    },
    Category: {
      default: [],
      withHierarchy: [
        { path: 'parent', select: 'name slug' },
        { path: 'children', select: 'name slug' },
      ],
      withPosts: [
        { path: 'parent', select: 'name slug' },
        {
          path: 'posts',
          select: 'title slug publishedAt',
          options: { limit: 20 },
        },
      ],
    },
  };

  return strategies[model] ? strategies[model].default : [];
};

/**
 * Middleware to optimize queries based on include parameter
 * Usage: ?include=author,comments,categories
 */
const queryOptimizer = (req, res, next) => {
  // Store optimization hints on request
  req.queryOptimization = {
    fields: req.query.fields ? req.query.fields.split(',') : [],
    include: req.query.include ? req.query.include.split(',') : [],
    lean: req.query.lean !== 'false', // Default to lean queries for performance
    limit: Math.min(parseInt(req.query.limit) || 20, 100),
    select: req.query.select ? req.query.select.split(',').join(' ') : null,
  };

  next();
};

/**
 * Apply population strategy intelligently
 */
const applyOptimizedPopulation = (query, include = [], modelName = '') => {
  const populationMap = {
    author: { path: 'author', select: 'username avatar firstName lastName' },
    comments: {
      path: 'comments',
      select: 'content author createdAt',
      options: { limit: 10, sort: { createdAt: -1 } },
      populate: { path: 'author', select: 'username avatar' },
    },
    category: { path: 'category', select: 'name slug' },
    categories: { path: 'categories', select: 'name slug' },
    tags: { path: 'tags', select: 'name slug' },
    followers: { path: 'followers', select: 'username avatar', options: { limit: 20 } },
    following: { path: 'following', select: 'username avatar', options: { limit: 20 } },
    parent: { path: 'parent', select: 'name slug' },
    children: { path: 'children', select: 'name slug' },
  };

  // Apply requested populations
  include.forEach((field) => {
    if (populationMap[field]) {
      query.populate(populationMap[field]);
    }
  });

  return query;
};

/**
 * Middleware to use lean queries for read-only operations
 * Lean queries return plain objects instead of Mongoose documents (faster)
 */
const useLeanQueries = (req, res, next) => {
  // Mark request as safe for lean queries if it's a GET request
  req.useLean = req.method === 'GET' && req.query.lean !== 'false';
  next();
};

/**
 * Caching hint middleware
 * Suggests which queries should be cached
 */
const cachingHint = (req, res, next) => {
  // Define cacheable endpoints and their TTL
  const cacheableEndpoints = {
    'GET /api/categories': 600, // 10 minutes
    'GET /api/tags': 600, // 10 minutes
    'GET /api/posts': 300, // 5 minutes
    'GET /api/posts/:id': 300, // 5 minutes
  };

  const requestKey = `${req.method} ${req.baseUrl}`;

  // Find matching cacheable endpoint
  for (const [endpoint, ttl] of Object.entries(cacheableEndpoints)) {
    if (req.method === 'GET' && req.path.match(endpoint.replace(/:\w+/g, '.+'))) {
      req.cacheTTL = ttl;
      break;
    }
  }

  next();
};

module.exports = {
  queryOptimizer,
  applyOptimizedPopulation,
  generatePopulationStrategy,
  useLeanQueries,
  cachingHint,
};
