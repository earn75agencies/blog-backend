/**
 * Streaming Seeder for Large Datasets
 * Supports batch processing of 1M+ records
 * Handles JSON import with parent references
 */

const mongoose = require('mongoose');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
require('dotenv').config();

const Category = require('../models/Category.model');
const Tag = require('../models/Tag.model');
const Post = require('../models/Post.model');

const BATCH_SIZE = 500; // Process 500 records at a time

/**
 * Stream and process JSON file line by line
 */
async function streamJSONFile(filePath, processor, batchSize = BATCH_SIZE) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let batch = [];
    let totalProcessed = 0;

    rl.on('line', async (line) => {
      try {
        const data = JSON.parse(line);
        batch.push(data);

        if (batch.length >= batchSize) {
          rl.pause();
          await processor(batch);
          totalProcessed += batch.length;
          console.log(`Processed ${totalProcessed} records...`);
          batch = [];
          rl.resume();
        }
      } catch (error) {
        console.error('Error processing line:', error);
      }
    });

    rl.on('close', async () => {
      // Process remaining batch
      if (batch.length > 0) {
        await processor(batch);
        totalProcessed += batch.length;
      }
      console.log(`Total processed: ${totalProcessed} records`);
      resolve(totalProcessed);
    });

    rl.on('error', reject);
  });
}

/**
 * Seed categories from JSON file
 */
async function seedCategoriesFromFile(filePath) {
  console.log('🌱 Starting category seeding from file...');
  
  const categoryMap = new Map(); // Store ID mappings for parent references
  
  await streamJSONFile(filePath, async (batch) => {
    const operations = [];
    
    for (const catData of batch) {
      // Handle parent reference
      let parentId = null;
      if (catData.parentId && categoryMap.has(catData.parentId)) {
        parentId = categoryMap.get(catData.parentId);
      } else if (catData.parentSlug) {
        const parent = await Category.findOne({ slug: catData.parentSlug }).lean();
        if (parent) parentId = parent._id;
      }

      // Check if category already exists
      const existing = await Category.findOne({ slug: catData.slug }).lean();
      if (existing) {
        categoryMap.set(catData.id || catData._id, existing._id);
        continue;
      }

      // Prepare category data
      const categoryData = {
        name: catData.name,
        slug: catData.slug,
        description: catData.description,
        parent: parentId,
        level: catData.level || 0,
        icon: catData.icon,
        color: catData.color,
        featured: catData.featured || false,
        isActive: catData.isActive !== false,
        order: catData.order || 0,
        metadata: catData.metadata || {},
      };

      operations.push({
        updateOne: {
          filter: { slug: catData.slug },
          update: { $setOnInsert: categoryData },
          upsert: true,
        },
      });
    }

    if (operations.length > 0) {
      await Category.bulkWrite(operations, { ordered: false });
      
      // Update category map with new IDs
      const inserted = await Category.find({
        slug: { $in: batch.map(c => c.slug) },
      }).lean();
      
      batch.forEach((catData, index) => {
        const insertedCat = inserted.find(c => c.slug === catData.slug);
        if (insertedCat) {
          categoryMap.set(catData.id || catData._id, insertedCat._id);
        }
      });
    }
  });

  console.log('✅ Category seeding completed!');
}

/**
 * Seed tags from JSON file
 */
async function seedTagsFromFile(filePath) {
  console.log('🏷️  Starting tag seeding from file...');
  
  await streamJSONFile(filePath, async (batch) => {
    const operations = batch.map(tagData => ({
      updateOne: {
        filter: { slug: tagData.slug },
        update: {
          $setOnInsert: {
            name: tagData.name,
            slug: tagData.slug,
            description: tagData.description,
            usageCount: tagData.usageCount || 0,
          },
        },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await Tag.bulkWrite(operations, { ordered: false });
    }
  });

  console.log('✅ Tag seeding completed!');
}

/**
 * Seed posts from JSON file
 */
async function seedPostsFromFile(filePath) {
  console.log('📝 Starting post seeding from file...');
  
  const categoryMap = new Map();
  const tagMap = new Map();
  const userMap = new Map();

  // Pre-load mappings
  const categories = await Category.find().lean();
  categories.forEach(cat => categoryMap.set(cat.slug, cat._id));

  const tags = await Tag.find().lean();
  tags.forEach(tag => tagMap.set(tag.slug, tag._id));

  await streamJSONFile(filePath, async (batch) => {
    const operations = [];
    
    for (const postData of batch) {
      // Resolve references
      const categoryId = postData.categorySlug 
        ? categoryMap.get(postData.categorySlug)
        : postData.category;
      
      const tagIds = postData.tagSlugs
        ? postData.tagSlugs.map(slug => tagMap.get(slug)).filter(Boolean)
        : postData.tags || [];

      const authorId = postData.authorUsername
        ? userMap.get(postData.authorUsername)
        : postData.author;

      if (!categoryId || !authorId) {
        console.warn(`Skipping post ${postData.slug}: missing references`);
        continue;
      }

      const postDoc = {
        title: postData.title,
        slug: postData.slug,
        excerpt: postData.excerpt,
        content: postData.content,
        author: authorId,
        category: categoryId,
        tags: tagIds,
        status: postData.status || 'published',
        publishedAt: postData.publishedAt ? new Date(postData.publishedAt) : new Date(),
        featuredImage: postData.featuredImage,
        views: postData.views || 0,
        isFeatured: postData.isFeatured || false,
      };

      operations.push({
        updateOne: {
          filter: { slug: postData.slug },
          update: { $setOnInsert: postDoc },
          upsert: true,
        },
      });
    }

    if (operations.length > 0) {
      await Post.bulkWrite(operations, { ordered: false });
    }
  });

  console.log('✅ Post seeding completed!');
}

/**
 * Main seeder function
 */
async function seedFromFile(type, filePath) {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gidi-blog';
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    switch (type) {
      case 'categories':
        await seedCategoriesFromFile(fullPath);
        break;
      case 'tags':
        await seedTagsFromFile(fullPath);
        break;
      case 'posts':
        await seedPostsFromFile(fullPath);
        break;
      default:
        throw new Error(`Unknown type: ${type}. Use: categories, tags, or posts`);
    }

    await mongoose.connection.close();
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const [type, filePath] = process.argv.slice(2);
  
  if (!type || !filePath) {
    console.error('Usage: node streaming-seeder.js <type> <filePath>');
    console.error('Types: categories, tags, posts');
    console.error('Example: node streaming-seeder.js categories ./data/categories.jsonl');
    process.exit(1);
  }

  seedFromFile(type, filePath);
}

module.exports = {
  seedFromFile,
  streamJSONFile,
  seedCategoriesFromFile,
  seedTagsFromFile,
  seedPostsFromFile,
};



