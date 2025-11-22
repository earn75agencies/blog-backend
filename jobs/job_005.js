const cron = require('node-cron');
const logger = require('../utils/logger.util');

/**
 * Scheduled Job 005
 * Description: Handles periodic task execution
 */
class Job005 {
  constructor() {
    this.name = 'Job005';
    this.schedule = '0 6 * * *'; // Daily at 6 AM
  }

  async execute() {
    try {
      logger.info(`Executing ${this.name}...`);
      
      // Send daily digest emails to subscribers
      const User = require('../models/User.model');
      const Post = require('../models/Post.model');
      const emailUtil = require('../utils/email.util');
      
      // Get yesterday's posts
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const recentPosts = await Post.find({
        status: 'published',
        publishedAt: { $gte: yesterday, $lt: today },
      })
        .populate('author', 'username')
        .select('title excerpt slug publishedAt')
        .limit(10)
        .sort({ publishedAt: -1 });
      
      if (recentPosts.length === 0) {
        logger.info(`${this.name}: No new posts to send in digest`);
        return;
      }
      
      // Get users subscribed to daily digest
      // Check if emailNotifications field exists, otherwise use default behavior
      const subscribers = await User.find({
        $or: [
          { emailNotifications: { $in: ['daily', 'all'] } },
          { emailNotifications: { $exists: false } }, // Default: send to all verified users
        ],
        isEmailVerified: true,
        isActive: true,
      }).select('email firstName username');
      
      let sentCount = 0;
      for (const subscriber of subscribers) {
        try {
          await emailUtil.sendDailyDigest(subscriber.email, {
            recipientName: subscriber.firstName || subscriber.username,
            posts: recentPosts,
            date: yesterday.toLocaleDateString(),
          });
          sentCount++;
        } catch (emailError) {
          logger.warn(`${this.name}: Failed to send digest to ${subscriber.email}:`, emailError.message);
        }
      }
      
      logger.info(`${this.name} completed successfully. Sent ${sentCount} daily digest emails`);
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

module.exports = new Job005();

