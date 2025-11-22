#!/usr/bin/env node

/**
 * Utility Script 005
 * Description: General purpose utility script
 */

const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('Script 005: Starting execution...');
    
    // Script logic here
    const result = await processData();
    
    console.log('Script 005: Execution completed');
    return result;
  } catch (error) {
    console.error('Script 005: Error occurred:', error);
    process.exit(1);
  }
}

async function processData() {
  // Search index rebuild script
  const mongoose = require('mongoose');
  require('dotenv').config();
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Post = require('../models/Post.model');
    
    // Rebuild text indexes for search
    await Post.collection.dropIndexes().catch(() => {
      console.log('No existing indexes to drop');
    });
    
    // Create text index on title, content, excerpt
    await Post.collection.createIndex(
      { title: 'text', content: 'text', excerpt: 'text' },
      { name: 'text_search_index' }
    );
    console.log('Text search index created');
    
    // Create other useful indexes
    await Post.collection.createIndex({ status: 1, publishedAt: -1 });
    await Post.collection.createIndex({ author: 1, createdAt: -1 });
    await Post.collection.createIndex({ category: 1, publishedAt: -1 });
    await Post.collection.createIndex({ tags: 1, publishedAt: -1 });
    await Post.collection.createIndex({ slug: 1 }, { unique: true });
    console.log('Additional indexes created');
    
    await mongoose.connection.close();
    return { success: true, scriptId: 5, message: 'Search indexes rebuilt' };
  } catch (error) {
    console.error('Index rebuild error:', error);
    throw error;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, processData };

