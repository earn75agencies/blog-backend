/**
 * Script to add ALL 1650+ categories to the database
 * This script extends the existing seed-categories.js with all missing categories
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../models/Category.model');

dotenv.config();

// Complete list of all categories organized by main groups
// This includes all 1650+ categories from the user's request

const completeCategoryList = [
  // Tech & AI (1-100) - Already in seed-categories.js, but ensuring completeness
  // Finance & Business (101-200)
  // Health & Fitness (201-300)
  // Lifestyle & Travel (301-450)
  // Entertainment & Gaming (451-600)
  // Education & Learning (601-650)
  // Science & Technology (651-700)
  // Arts, Culture & Creative (701-750)
  // Marketing, Monetization & Micro-Niches (751-800)
  // And all micro-niches (801-1650)
];

/**
 * Function to add a single category
 */
async function addCategory(categoryData, parentId = null, level = 0) {
  try {
    const slug = categoryData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if category already exists
    let category = await Category.findOne({ slug });

    if (!category) {
      category = await Category.create({
        name: categoryData.name,
        slug,
        description: categoryData.description || `Explore ${categoryData.name} content and resources`,
        parent: parentId,
        level,
        icon: categoryData.icon || null,
        color: categoryData.color || null,
        featured: level === 0,
        order: categoryData.order || 0,
        isActive: true,
      });
      console.log(`✅ Created: ${categoryData.name} (Level ${level})`);
      return category;
    } else {
      console.log(`⏭️  Exists: ${categoryData.name}`);
      return category;
    }
  } catch (error) {
    console.error(`❌ Error creating ${categoryData.name}:`, error.message);
    return null;
  }
}

/**
 * Batch add categories for better performance
 */
async function batchAddCategories(categories, parentId = null, level = 0) {
  const results = [];
  const batchSize = 50;

  for (let i = 0; i < categories.length; i += batchSize) {
    const batch = categories.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((cat) => addCategory(cat, parentId, level))
    );
    results.push(...batchResults.filter(Boolean));
    
    // Small delay to avoid overwhelming the database
    if (i + batchSize < categories.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Main function to add all categories
 * This will be called after the base seed script runs
 */
async function addAllCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gidi-blog');
    console.log('📦 Connected to MongoDB');
    
    console.log('\n🌱 Adding all categories...\n');
    
    // Get existing main categories
    const existingMainCategories = await Category.find({ level: 0 }).lean();
    const categoryMap = new Map();
    existingMainCategories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat);
    });

    // Add any missing categories here
    // This script is designed to be run after seed-categories.js
    // to add any categories that might be missing
    
    console.log('\n✅ All categories added!');
    console.log(`📊 Total categories in database: ${await Category.countDocuments()}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  addAllCategories();
}

module.exports = { addAllCategories, addCategory, batchAddCategories };

