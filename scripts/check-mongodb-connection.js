/**
 * Script to check MongoDB connection and display helpful information
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const https = require('https');

dotenv.config();

async function getCurrentIP() {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org?format=json', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const ip = JSON.parse(data).ip;
          resolve(ip);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function checkConnection() {
  try {
    console.log('🔍 Checking MongoDB Connection...\n');
    
    // Get current IP
    try {
      const currentIP = await getCurrentIP();
      console.log(`📍 Your current IP address: ${currentIP}`);
      console.log('   (Add this IP to MongoDB Atlas Network Access if needed)\n');
    } catch (error) {
      console.log('⚠️  Could not determine your IP address\n');
    }
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gidi-blog';
    
    console.log(`🔌 Attempting to connect...`);
    console.log(`   URI: ${mongoUri.includes('@') ? 'mongodb://***@' + mongoUri.split('@')[1] : mongoUri}\n`);
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ Successfully connected to MongoDB!');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   Collections: ${collections.length} found`);
    
    await mongoose.connection.close();
    console.log('\n🎉 Connection test passed! You can now run the seed script.');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Connection failed!\n');
    console.error(`Error: ${error.message}\n`);
    
    if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.error('🔒 IP Whitelist Issue Detected!\n');
      console.error('📝 Quick Fix Steps:');
      console.error('   1. Visit: https://cloud.mongodb.com/');
      console.error('   2. Go to: Network Access → IP Access List');
      console.error('   3. Click "Add IP Address"');
      console.error('   4. Add your current IP (shown above)');
      console.error('   5. OR add 0.0.0.0/0 for development (allows all IPs)');
      console.error('   6. Wait 1-2 minutes, then try again\n');
    } else if (error.message.includes('authentication')) {
      console.error('🔐 Authentication Error!');
      console.error('   Check your .env file for correct MONGODB_URI');
      console.error('   Format: mongodb+srv://username:password@cluster.mongodb.net/database\n');
    } else if (error.message.includes('timeout')) {
      console.error('⏱️  Connection Timeout!');
      console.error('   - Check your internet connection');
      console.error('   - Verify MongoDB Atlas cluster is running');
      console.error('   - Try using local MongoDB: mongodb://localhost:27017/gidi-blog\n');
    }
    
    process.exit(1);
  }
}

// Run check
checkConnection();

