/**
 * Database Migration Script
 * Syncs database schema with Mongoose models and creates indexes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import all models to register their schemas
const modelsPath = path.join(__dirname, '../models');
const modelFiles = fs.readdirSync(modelsPath).filter(file => file.endsWith('.model.js'));

console.log('📦 Loading models...');
modelFiles.forEach(file => {
  try {
    require(path.join(modelsPath, file));
    console.log(`   ✓ Loaded ${file}`);
  } catch (error) {
    console.error(`   ✗ Failed to load ${file}:`, error.message);
  }
});

async function syncIndexes() {
  console.log('\n🔄 Syncing database indexes...');
  
  const models = mongoose.modelNames();
  let successCount = 0;
  let errorCount = 0;

  for (const modelName of models) {
    try {
      const Model = mongoose.model(modelName);
      console.log(`   Syncing indexes for ${modelName}...`);
      
      // Sync indexes - this creates missing indexes and removes extra ones
      await Model.syncIndexes();
      console.log(`   ✓ ${modelName} indexes synced`);
      successCount++;
    } catch (error) {
      console.error(`   ✗ Failed to sync ${modelName}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ Index sync completed: ${successCount} successful, ${errorCount} errors`);
  return { successCount, errorCount };
}

async function createCollections() {
  console.log('\n📚 Ensuring collections exist...');
  
  const models = mongoose.modelNames();
  let createdCount = 0;

  for (const modelName of models) {
    try {
      const Model = mongoose.model(modelName);
      const collectionName = Model.collection.name;
      
      // Check if collection exists
      const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
      
      if (collections.length === 0) {
        // Create collection by inserting and deleting a dummy document
        await Model.createCollection();
        console.log(`   ✓ Created collection: ${collectionName}`);
        createdCount++;
      } else {
        console.log(`   ✓ Collection exists: ${collectionName}`);
      }
    } catch (error) {
      // Collection might already exist, which is fine
      if (!error.message.includes('already exists')) {
        console.error(`   ✗ Error with ${modelName}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Collections check completed: ${createdCount} new collections`);
  return createdCount;
}

async function runCustomMigrations() {
  console.log('\n🔧 Running custom migrations...');
  
  const migrationsPath = path.join(__dirname, '../migrations');
  
  if (!fs.existsSync(migrationsPath)) {
    console.log('   No migrations directory found, skipping custom migrations');
    return;
  }

  const migrationFiles = fs.readdirSync(migrationsPath)
    .filter(file => file.endsWith('.js') && file.startsWith('migration_'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('   No migration files found');
    return;
  }

  // Check which migrations have been run
  const MigrationLog = mongoose.connection.db.collection('migration_log');
  
  for (const file of migrationFiles) {
    try {
      const migration = require(path.join(migrationsPath, file));
      const migrationName = path.basename(file, '.js');
      
      // Check if migration has been run
      const existing = await MigrationLog.findOne({ migration: migrationName });
      
      if (existing) {
        console.log(`   ⏭️  Skipping ${migrationName} (already run)`);
        continue;
      }

      console.log(`   ▶️  Running ${migrationName}...`);
      
      // Run migration
      if (typeof migration.up === 'function') {
        await migration.up(mongoose.connection.db);
        
        // Log migration
        await MigrationLog.insertOne({
          migration: migrationName,
          runAt: new Date(),
          status: 'completed'
        });
        
        console.log(`   ✓ ${migrationName} completed`);
      } else {
        console.log(`   ⚠️  ${migrationName} has no 'up' function, skipping`);
      }
    } catch (error) {
      console.error(`   ✗ Failed to run ${file}:`, error.message);
      throw error;
    }
  }

  console.log('\n✅ Custom migrations completed');
}

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gidi-blog';
    
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);

    // Step 1: Create collections
    await createCollections();

    // Step 2: Sync indexes
    await syncIndexes();

    // Step 3: Run custom migrations
    await runCustomMigrations();

    console.log('\n🎉 Migration completed successfully!');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
main();


