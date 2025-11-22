#!/usr/bin/env node
/**
 * Admin Seeding Script
 * Creates default admin accounts on first run
 * Usage: node scripts/seedAdmins.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import User model
const User = require('../models/User.model');

const seedAdmins = async () => {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get admin credentials from environment variables
    const admins = [
      {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        firstName: process.env.ADMIN_FIRST_NAME,
        lastName: process.env.ADMIN_LAST_NAME,
        username: process.env.ADMIN_USERNAME,
        role: 'admin',
        type: 'Primary Admin',
      },
      {
        email: process.env.SUPER_ADMIN_EMAIL,
        password: process.env.SUPER_ADMIN_PASSWORD,
        firstName: process.env.SUPER_ADMIN_FIRST_NAME,
        lastName: process.env.SUPER_ADMIN_LAST_NAME,
        username: process.env.SUPER_ADMIN_USERNAME,
        role: 'admin',
        type: 'Super Admin',
      },
    ];

    let createdCount = 0;
    let existingCount = 0;

    for (const adminData of admins) {
      // Validate required fields
      if (!adminData.email || !adminData.password || !adminData.username) {
        console.warn(`⚠️  Skipping ${adminData.type} - Missing required credentials in .env`);
        continue;
      }

      // Check if admin already exists
      const existingAdmin = await User.findOne({
        $or: [{ email: adminData.email }, { username: adminData.username }],
      });

      if (existingAdmin) {
        console.log(`⏭️  ${adminData.type} already exists (${adminData.email})`);
        existingCount++;
        continue;
      }

      // Create new admin user
      // Password hashing is automatically handled by User model's pre-save middleware
      const newAdmin = new User({
        username: adminData.username,
        email: adminData.email,
        password: adminData.password, // Pass plain password - model will hash it
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: adminData.role,
        isEmailVerified: true, // Admins are auto-verified
        isActive: true,
      });

      await newAdmin.save();
      console.log(`✅ ${adminData.type} created successfully`);
      console.log(`   📧 Email: ${adminData.email}`);
      console.log(`   👤 Username: ${adminData.username}`);
      createdCount++;
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEED SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${createdCount} admin(s)`);
    console.log(`⏭️  Already existed: ${existingCount} admin(s)`);

    if (createdCount > 0) {
      console.log('\n🔐 IMPORTANT - Store these credentials securely:');
      console.log('─'.repeat(60));
      for (const adminData of admins) {
        if (adminData.email && adminData.password) {
          console.log(`\n${adminData.type}:`);
          console.log(`  Email: ${adminData.email}`);
          console.log(`  Password: ${adminData.password}`);
          console.log(`  ⚠️  Change password on first login!`);
        }
      }
      console.log('\n' + '─'.repeat(60));
    }

    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Error seeding admins:', error.message);
    if (error.response?.data) {
      console.error('Details:', error.response.data);
    }
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
};

// Run seeding script
seedAdmins();
