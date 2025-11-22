#!/usr/bin/env node

/**
 * Utility Script 004
 * Description: General purpose utility script
 */

const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('Script 004: Starting execution...');
    
    // Script logic here
    const result = await processData();
    
    console.log('Script 004: Execution completed');
    return result;
  } catch (error) {
    console.error('Script 004: Error occurred:', error);
    process.exit(1);
  }
}

async function processData() {
  // Analytics aggregation script
  const mongoose = require('mongoose');
  require('dotenv').config();
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Post = require('../models/Post.model');
    const User = require('../models/User.model');
    const analyticsService = require('../services/analytics.service');
    
    // Generate analytics report
    const stats = await analyticsService.getOverallStats();
    
    console.log('=== Analytics Report ===');
    console.log(`Total Users: ${stats.users.total}`);
    console.log(`Active Users: ${stats.users.active}`);
    console.log(`Total Posts: ${stats.posts.total}`);
    console.log(`Published Posts: ${stats.posts.published}`);
    console.log(`Draft Posts: ${stats.posts.draft}`);
    console.log(`Total Views: ${stats.views.total}`);
    console.log(`Unique Views: ${stats.views.unique}`);
    console.log(`Total Comments: ${stats.comments.total}`);
    
    await mongoose.connection.close();
    return { success: true, scriptId: 4, stats };
  } catch (error) {
    console.error('Analytics error:', error);
    throw error;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, processData };

