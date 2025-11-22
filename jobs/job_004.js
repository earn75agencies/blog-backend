const cron = require('node-cron');
const logger = require('../utils/logger.util');

/**
 * Scheduled Job 004
 * Description: Handles periodic task execution
 */
class Job004 {
  constructor() {
    this.name = 'Job004';
    this.schedule = '0 0 * * *'; // Daily at midnight
  }

  async execute() {
    try {
      logger.info(`Executing ${this.name}...`);
      
      // Daily analytics aggregation and cleanup
      const analyticsService = require('../services/analytics.service');
      
      // Generate daily analytics report
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailyStats = await analyticsService.getOverallStats();
      logger.info(`${this.name}: Daily stats - Users: ${dailyStats.users.total}, Posts: ${dailyStats.posts.total}, Views: ${dailyStats.views.total}`);
      
      // Clean up old notifications (older than 90 days)
      const Notification = require('../models/Notification.model');
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const deletedNotifications = await Notification.deleteMany({
        createdAt: { $lt: ninetyDaysAgo },
        isRead: true,
      });
      
      logger.info(`${this.name} completed successfully. Deleted ${deletedNotifications.deletedCount} old notifications`);
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

module.exports = new Job004();

