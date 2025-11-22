const cron = require('node-cron');
const logger = require('../utils/logger.util');

/**
 * Scheduled Job 002
 * Description: Handles periodic task execution
 */
class Job002 {
  constructor() {
    this.name = 'Job002';
    this.schedule = '0 */2 * * *'; // Every 2 hours
  }

  async execute() {
    try {
      logger.info(`Executing ${this.name}...`);
      
      // Publish scheduled posts
      const Post = require('../models/Post.model');
      const now = new Date();
      
      const scheduledPosts = await Post.updateMany(
        {
          status: 'scheduled',
          scheduledPublishAt: { $lte: now },
        },
        {
          $set: {
            status: 'published',
            publishedAt: now,
            scheduledPublishAt: null,
          },
        }
      );
      
      logger.info(`${this.name} completed successfully. Published ${scheduledPosts.modifiedCount} scheduled posts`);
    } catch (error) {
      logger.error(`Error executing ${this.name}:`, error);
    }
  }

  start() {
    cron.schedule(this.schedule, () => {
      this.execute();
    });
    logger.info(`${this.name} scheduled with pattern: ${this.schedule}`);
  }
}

module.exports = new Job002();

