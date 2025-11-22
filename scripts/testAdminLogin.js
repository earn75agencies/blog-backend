#!/usr/bin/env node
/**
 * Test Admin Login Script
 * Tests if admin credentials work correctly
 * Usage: node scripts/testAdminLogin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

const testLogin = async () => {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Test credentials
    const testAccounts = [
      {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        name: 'Primary Admin',
      },
      {
        email: process.env.SUPER_ADMIN_EMAIL,
        password: process.env.SUPER_ADMIN_PASSWORD,
        name: 'Super Admin',
      },
    ];

    console.log('🧪 Testing Admin Login Credentials\n');
    console.log('='.repeat(60));

    for (const account of testAccounts) {
      console.log(`\n📝 Testing: ${account.name}`);
      console.log(`   Email: ${account.email}`);

      try {
        // Find user and include password
        const user = await User.findOne({ email: account.email }).select('+password');

        if (!user) {
          console.log(`   ❌ User not found in database`);
          console.log(`   💡 Solution: Run 'node scripts/seedAdmins.js' to create admins`);
          continue;
        }

        console.log(`   ✅ User found in database`);
        console.log(`   👤 Username: ${user.username}`);
        console.log(`   🔐 Role: ${user.role}`);
        console.log(`   ✉️  Email Verified: ${user.isEmailVerified ? 'Yes' : 'No'}`);

        // Test password comparison
        const isPasswordValid = await user.comparePassword(account.password);

        if (isPasswordValid) {
          console.log(`   ✅ Password is CORRECT - Login will work!`);
        } else {
          console.log(`   ❌ Password is INCORRECT - Login will fail`);
          console.log(`   💡 This usually means passwords were double-hashed`);
        }
      } catch (error) {
        console.log(`   ❌ Error testing login: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Test complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testLogin();
