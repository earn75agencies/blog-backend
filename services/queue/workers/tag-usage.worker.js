/**
 * Tag Usage Worker
 * Updates tag usage counts asynchronously when posts are created/updated
 */

const { Worker } = require('bullmq');
const Tag = require('../../../models/Tag.model');
const { redisConnection } = require('../queue.service');

const worker = new Worker(
  'tag-usage',
  async (job) => {
    const { action, postId, tagIds } = job.data;

    try {
      if (action === 'increment') {
        // Increment usage count for tags
        await Tag.updateMany(
          { _id: { $in: tagIds } },
          { $inc: { usageCount: 1 } }
        );
      } else if (action === 'decrement') {
        // Decrement usage count for tags
        await Tag.updateMany(
          { _id: { $in: tagIds }, usageCount: { $gt: 0 } },
          { $inc: { usageCount: -1 } }
        );
      } else if (action === 'update') {
        // Update tags (remove old, add new)
        const { oldTagIds, newTagIds } = job.data;
        
        // Decrement old tags
        if (oldTagIds && oldTagIds.length > 0) {
          await Tag.updateMany(
            { _id: { $in: oldTagIds }, usageCount: { $gt: 0 } },
            { $inc: { usageCount: -1 } }
          );
        }
        
        // Increment new tags
        if (newTagIds && newTagIds.length > 0) {
          await Tag.updateMany(
            { _id: { $in: newTagIds } },
            { $inc: { usageCount: 1 } }
          );
        }
      }

      return { success: true, postId, tagIds };
    } catch (error) {
      console.error('Tag usage worker error:', error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10, // Process 10 jobs concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // Per second
    },
  }
);

worker.on('completed', (job) => {
  console.log(`Tag usage job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Tag usage job ${job.id} failed:`, err);
});

module.exports = worker;



