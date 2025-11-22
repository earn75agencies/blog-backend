/**
 * Request Deduplication Utility
 * Prevents duplicate concurrent requests from overwhelming the system
 * Useful for expensive operations (API calls, database queries, etc.)
 */

class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Execute deduplicated async function
   * If same request is pending, wait for and return the same result
   */
  async execute(key, asyncFn) {
    // If request is already pending, wait for it
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 Waiting for duplicate request: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Start new request
    const promise = asyncFn()
      .then((result) => {
        // Clean up on success
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        // Clean up on error
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }

  /**
   * Get number of pending requests
   */
  getPendingCount() {
    return this.pendingRequests.size;
  }
}

/**
 * HTTP Request Deduplication Middleware
 * Prevents duplicate concurrent HTTP requests
 */
const httpRequestDeduplicator = () => {
  const deduplicator = new RequestDeduplicator();

  return (req, res, next) => {
    // Only deduplicate GET requests and certain POST requests
    const isIdempotent = req.method === 'GET' || 
      (req.method === 'POST' && req.headers['x-idempotent-key']);

    if (!isIdempotent) {
      return next();
    }

    // Create deduplication key from request
    const key = `${req.method}:${req.path}:${JSON.stringify(req.query || {})}`;

    // Store deduplicator on request
    req.deduplicator = deduplicator;
    req.deduplicationKey = key;

    next();
  };
};

/**
 * Middleware to handle request deduplication
 * Attach to specific routes that need deduplication
 */
const withRequestDeduplication = (deduplicator) => {
  return (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;

    res.json = function(data) {
      // Execute the actual endpoint logic only once
      if (req.deduplicationKey) {
        deduplicator
          .execute(req.deduplicationKey, () => Promise.resolve(data))
          .then(() => {
            originalJson.call(this, data);
          });
      } else {
        originalJson.call(this, data);
      }
    };

    next();
  };
};

/**
 * Example usage with route
 */
const exampleDeduplicatedRoute = (router, deduplicator) => {
  router.get('/expensive-operation', (req, res, next) => {
    deduplicator
      .execute(`expensive:${JSON.stringify(req.query)}`, async () => {
        // Perform expensive operation
        const result = await new Promise((resolve) => {
          setTimeout(() => resolve({ data: 'expensive result' }), 1000);
        });
        return result;
      })
      .then((result) => {
        res.json({ status: 'success', data: result });
      })
      .catch((error) => {
        next(error);
      });
  });
};

module.exports = {
  RequestDeduplicator,
  httpRequestDeduplicator,
  withRequestDeduplication,
  exampleDeduplicatedRoute,
};
