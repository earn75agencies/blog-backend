const cron = require('node-cron');
const logger = require('../utils/logger.util');

/**
 * Scheduled Job 001
 * Description: Handles periodic task execution
 */
class Job001 {
  constructor() {
    this.name = 'Job001';
    this.schedule = '0 * * * *'; // Every hour
  }

  async execute() {
    try {
      logger.info(`Executing ${this.name}...`);
      
      // Clean up expired password reset tokens and email verification tokens
      const User = require('../models/User.model');
      const now = new Date();
      
      // Clean up expired password reset tokens
      const usersWithExpiredTokens = await User.updateMany(
        {
          passwordResetExpires: { $lt: now },
          passwordResetToken: { $exists: true },
        },
        {
          $unset: {
            passwordResetToken: '',
            passwordResetExpires: '',
          },
        }
      );
      
      // Clean up old unverified accounts (older than 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const deletedUnverified = await User.deleteMany({
        isEmailVerified: false,
        createdAt: { $lt: thirtyDaysAgo },
      });
      
      logger.info(`${this.name} completed successfully. Cleaned ${usersWithExpiredTokens.modifiedCount} expired tokens, deleted ${deletedUnverified.deletedCount} unverified accounts`);
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

module.exports = new Job001();

