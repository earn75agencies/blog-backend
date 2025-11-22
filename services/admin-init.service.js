/**
 * Admin Initialization Service
 * Automatically creates default admin accounts on server startup if they don't exist
 * Called once from server.js during application initialization
 */

const User = require('../models/User.model');

/**
 * Initialize default admin accounts
 * This function is called once when the server starts
 * It creates admin accounts from .env variables if they don't already exist
 * 
 * NOTE: Password hashing is handled by the User model's pre-save middleware
 * We pass the plain password here, and the model will hash it automatically
 */
const initializeAdmins = async () => {
  try {
    // Check if at least one admin exists
    const adminCount = await User.countDocuments({ role: 'admin' });

    if (adminCount > 0) {
      console.log(`✅ Admin accounts already initialized (${adminCount} admin(s) found)`);
      return;
    }

    console.log('🔄 Initializing default admin accounts...');

    const admins = [
      {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        firstName: process.env.ADMIN_FIRST_NAME,
        lastName: process.env.ADMIN_LAST_NAME,
        username: process.env.ADMIN_USERNAME,
        type: 'Primary Admin',
      },
      {
        email: process.env.SUPER_ADMIN_EMAIL,
        password: process.env.SUPER_ADMIN_PASSWORD,
        firstName: process.env.SUPER_ADMIN_FIRST_NAME,
        lastName: process.env.SUPER_ADMIN_LAST_NAME,
        username: process.env.SUPER_ADMIN_USERNAME,
        type: 'Super Admin',
      },
    ];

    let createdCount = 0;

    for (const adminData of admins) {
      // Validate required fields
      if (!adminData.email || !adminData.password || !adminData.username) {
        console.warn(`⚠️  Skipping ${adminData.type} - Missing credentials in .env`);
        continue;
      }

      // Check if this admin already exists
      const existingAdmin = await User.findOne({
        $or: [{ email: adminData.email }, { username: adminData.username }],
      });

      if (existingAdmin) {
        console.log(`⏭️  ${adminData.type} already exists (${adminData.email})`);
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
        role: 'admin',
        isEmailVerified: true, // Auto-verify admin accounts
        isActive: true,
      });

      await newAdmin.save();
      console.log(`✅ ${adminData.type} initialized: ${adminData.email}`);
      createdCount++;
    }

    if (createdCount > 0) {
      console.log(`\n🎉 Successfully created ${createdCount} default admin account(s)`);
      console.log('⚠️  Default passwords are in .env - Change on first login!');
    }
  } catch (error) {
    console.error('❌ Error initializing admin accounts:', error.message);
    // Don't crash the server, just log the error
    // Admins can be created manually later using the seedAdmins.js script
  }
};

module.exports = { initializeAdmins };
