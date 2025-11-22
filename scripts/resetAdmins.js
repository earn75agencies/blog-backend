#!/usr/bin/env node
/**
 * Reset Admin Accounts Script
 * Deletes existing admin accounts so they can be recreated with correct password hashing
 * Usage: node scripts/resetAdmins.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

const resetAdmins = async () => {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Admin emails to delete
    const adminEmails = [
      process.env.ADMIN_EMAIL,
      process.env.SUPER_ADMIN_EMAIL,
    ];

    console.log('⚠️  Deleting existing admin accounts...\n');

    for (const email of adminEmails) {
      const result = await User.deleteOne({ email });
      if (result.deletedCount > 0) {
        console.log(`✅ Deleted: ${email}`);
      } else {
        console.log(`⏭️  Not found: ${email}`);
      }
    }

    console.log('\n✨ Admin accounts reset! Now run: node scripts/seedAdmins.js\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetAdmins();
