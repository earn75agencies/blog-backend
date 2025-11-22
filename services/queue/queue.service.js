/**
 * Background Job Queue Service
 * Note: Queue functionality is disabled as Redis has been removed.
 * Jobs will be executed synchronously or can be replaced with a different queue system.
 */

// Queue functionality disabled - Redis removed
const queues = {};
const queueEvents = {};
const redisConnection = null;

/**
 * Add job to queue
 * Note: Queue functionality is disabled. This is a no-op function.
 * For background jobs, consider using a different queue system or execute synchronously.
 */
async function addJob(queueName, jobData, options = {}) {
  console.warn(`⚠️  Queue functionality disabled: Attempted to add job to ${queueName}`);
  // Return a mock job object to maintain compatibility
  return {
    id: `mock-${Date.now()}`,
    name: jobData.name || 'default',
    data: jobData,
    opts: options,
  };
}

/**
 * Get queue stats
 * Note: Queue functionality is disabled. Returns empty stats.
 */
async function getQueueStats(queueName) {
  console.warn(`⚠️  Queue functionality disabled: Attempted to get stats for ${queueName}`);
  return {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    total: 0,
  };
}

/**
 * Clean old jobs
 * Note: Queue functionality is disabled. This is a no-op function.
 */
async function cleanQueue(queueName, grace = 24 * 3600 * 1000) {
  console.warn(`⚠️  Queue functionality disabled: Attempted to clean queue ${queueName}`);
  // No-op
}

/**
 * Close all queue connections
 */
async function closeAll() {
  // No connections to close
  return Promise.resolve();
}

module.exports = {
  queues,
  queueEvents,
  addJob,
  getQueueStats,
  cleanQueue,
  closeAll,
  redisConnection,
};



