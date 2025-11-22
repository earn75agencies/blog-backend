#!/usr/bin/env node

/**
 * Utility Script 002
 * Description: General purpose utility script
 */

const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('Script 002: Starting execution...');
    
    // Script logic here
    const result = await processData();
    
    console.log('Script 002: Execution completed');
    return result;
  } catch (error) {
    console.error('Script 002: Error occurred:', error);
    process.exit(1);
  }
}

async function processData() {
  // Database backup script
  const mongoose = require('mongoose');
  const fs = require('fs').promises;
  require('dotenv').config();
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const backupDir = path.join(__dirname, '../backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
    
    // Export all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const backup = {};
    
    for (const collection of collections) {
      const Model = mongoose.connection.db.collection(collection.name);
      const documents = await Model.find({}).toArray();
      backup[collection.name] = documents;
      console.log(`Backed up ${collection.name}: ${documents.length} documents`);
    }
    
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    console.log(`Backup saved to: ${backupFile}`);
    
    await mongoose.connection.close();
    return { success: true, scriptId: 2, backupFile };
  } catch (error) {
    console.error('Backup error:', error);
    throw error;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, processData };

