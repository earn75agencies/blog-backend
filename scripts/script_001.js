#!/usr/bin/env node

/**
 * Utility Script 001
 * Description: General purpose utility script
 */

const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('Script 001: Starting execution...');
    
    // Script logic here
    const result = await processData();
    
    console.log('Script 001: Execution completed');
    return result;
  } catch (error) {
    console.error('Script 001: Error occurred:', error);
    process.exit(1);
  }
}

async function processData() {
  // Database migration/seed script
  const mongoose = require('mongoose');
  require('dotenv').config();
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Example: Create default admin user if not exists
    const User = require('../models/User.model');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gidi.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        username: 'admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true,
        firstName: 'Admin',
        lastName: 'User',
      });
      console.log('Default admin user created:', admin.email);
    } else {
      console.log('Admin user already exists');
    }
    
    await mongoose.connection.close();
    return { success: true, scriptId: 1, message: 'Migration completed' };
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, processData };

