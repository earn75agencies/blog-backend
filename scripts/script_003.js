#!/usr/bin/env node

/**
 * Utility Script 003
 * Description: General purpose utility script
 */

const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('Script 003: Starting execution...');
    
    // Script logic here
    const result = await processData();
    
    console.log('Script 003: Execution completed');
    return result;
  } catch (error) {
    console.error('Script 003: Error occurred:', error);
    process.exit(1);
  }
}

async function processData() {
  // Database cleanup script - remove orphaned data
  const mongoose = require('mongoose');
  require('dotenv').config();
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Post = require('../models/Post.model');
    const User = require('../models/User.model');
    const Comment = require('../models/Comment.model');
    
    // Remove posts with invalid authors
    const validUserIds = (await User.find({}).select('_id')).map(u => u._id);
    const orphanedPosts = await Post.updateMany(
      { author: { $nin: validUserIds } },
      { $set: { status: 'deleted' } }
    );
    console.log(`Marked ${orphanedPosts.modifiedCount} orphaned posts as deleted`);
    
    // Remove comments with invalid posts or authors
    const validPostIds = (await Post.find({}).select('_id')).map(p => p._id);
    const orphanedComments = await Comment.deleteMany({
      $or: [
        { post: { $nin: validPostIds } },
        { author: { $nin: validUserIds } },
      ],
    });
    console.log(`Deleted ${orphanedComments.deletedCount} orphaned comments`);
    
    await mongoose.connection.close();
    return { success: true, scriptId: 3, cleaned: { posts: orphanedPosts.modifiedCount, comments: orphanedComments.deletedCount } };
  } catch (error) {
    console.error('Cleanup error:', error);
    throw error;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, processData };

