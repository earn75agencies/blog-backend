const cron = require('node-cron');
const logger = require('../utils/logger.util');

/**
 * Scheduled Job 003
 * Description: Handles periodic task execution
 */
class Job003 {
  constructor() {
    this.name = 'Job003';
    this.schedule = '0 */3 * * *'; // Every 3 hours
  }

  async execute() {
    try {
      logger.info(`Executing ${this.name}...`);
      
      // Generate and update sitemap
      const seoService = require('../services/seo.service');
      
      try {
        await seoService.generateSitemap();
        logger.info(`${this.name}: Sitemap generated successfully`);
      } catch (sitemapError) {
        logger.warn(`${this.name}: Failed to generate sitemap:`, sitemapError.message);
      }
      
      // Update tag usage counts
      const Tag = require('../models/Tag.model');
      const Post = require('../models/Post.model');
      
      const allTags = await Tag.find({});
      for (const tag of allTags) {
        const usageCount = await Post.countDocuments({
          tags: tag._id,
          status: 'published',
        });
        
        if (tag.usageCount !== usageCount) {
          tag.usageCount = usageCount;
          await tag.save();
        }
      }
      
      logger.info(`${this.name} completed successfully`);
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

module.exports = new Job003();

