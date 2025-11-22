/**
 * Database Migration 002
 * Description: Database schema migration
 */

async function up(db) {
  try {
    await db.collection('collection_002').createIndex({ field_001: 1 });
    await db.collection('collection_002').createIndex({ field_002: 1, field_003: -1 });
    console.log('Migration 002: Up migration completed');
  } catch (error) {
    console.error('Migration 002: Up migration failed:', error);
    throw error;
  }
}

async function down(db) {
  try {
    await db.collection('collection_002').dropIndex('field_001_1');
    await db.collection('collection_002').dropIndex('field_002_1_field_003_-1');
    console.log('Migration 002: Down migration completed');
  } catch (error) {
    console.error('Migration 002: Down migration failed:', error);
    throw error;
  }
}

module.exports = { up, down };

