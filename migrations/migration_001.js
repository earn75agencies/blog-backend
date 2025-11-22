/**
 * Database Migration 001
 * Description: Database schema migration
 */

async function up(db) {
  try {
    await db.collection('collection_001').createIndex({ field_001: 1 });
    await db.collection('collection_001').createIndex({ field_002: 1, field_003: -1 });
    console.log('Migration 001: Up migration completed');
  } catch (error) {
    console.error('Migration 001: Up migration failed:', error);
    throw error;
  }
}

async function down(db) {
  try {
    await db.collection('collection_001').dropIndex('field_001_1');
    await db.collection('collection_001').dropIndex('field_002_1_field_003_-1');
    console.log('Migration 001: Down migration completed');
  } catch (error) {
    console.error('Migration 001: Down migration failed:', error);
    throw error;
  }
}

module.exports = { up, down };

