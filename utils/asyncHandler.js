/**
 * Async handler wrapper
 * Catches async errors and passes them to error handler
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Async handler with custom error handling
 * @param {Function} fn - Async function to wrap
 * @param {Function} errorHandler - Custom error handler
 * @returns {Function} Wrapped function
 */
const asyncHandlerWithCustomError = (fn, errorHandler) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    if (errorHandler) {
      errorHandler(error, req, res, next);
    } else {
      next(error);
    }
  });
};

/**
 * Async handler with timeout
 * @param {Function} fn - Async function to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Function} Wrapped function
 */
const asyncHandlerWithTimeout = (fn, timeoutMs = 30000) => (req, res, next) => {
  const timeout = setTimeout(() => {
    const error = new Error('Request timeout');
    error.statusCode = 408;
    next(error);
  }, timeoutMs);

  Promise.resolve(fn(req, res, next))
    .then((result) => {
      clearTimeout(timeout);
      return result;
    })
    .catch((error) => {
      clearTimeout(timeout);
      next(error);
    });
};

/**
 * Async handler with retry logic
 * @param {Function} fn - Async function to wrap
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delayMs - Delay between retries in milliseconds
 * @returns {Function} Wrapped function
 */
const asyncHandlerWithRetry = (fn, maxRetries = 3, delayMs = 1000) => async (req, res, next) => {
  let lastError;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      await Promise.resolve(fn(req, res, next));
      return;
    } catch (error) {
      lastError = error;
      attempts++;

      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempts));
      }
    }
  }

  next(lastError);
};

/**
 * Batch async handler
 * Executes multiple async functions in parallel
 * @param {Array<Function>} fns - Array of async functions
 * @returns {Function} Wrapped function
 */
const batchAsyncHandler = (...fns) => async (req, res, next) => {
  try {
    const results = await Promise.all(fns.map((fn) => Promise.resolve(fn(req, res, next))));
    return results;
  } catch (error) {
    next(error);
  }
};

/**
 * Sequence async handler
 * Executes multiple async functions in sequence
 * @param {Array<Function>} fns - Array of async functions
 * @returns {Function} Wrapped function
 */
const sequenceAsyncHandler = (...fns) => async (req, res, next) => {
  try {
    const results = [];
    for (const fn of fns) {
      const result = await Promise.resolve(fn(req, res, next));
      results.push(result);
    }
    return results;
  } catch (error) {
    next(error);
  }
};

module.exports = {
  asyncHandler,
  asyncHandlerWithCustomError,
  asyncHandlerWithTimeout,
  asyncHandlerWithRetry,
  batchAsyncHandler,
  sequenceAsyncHandler,
};

