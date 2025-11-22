const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('../config/jwt.config');

/**
 * User Schema
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'author', 'admin'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    favoritePosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    mutedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Social login support
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook', 'apple', 'linkedin', 'magic-link'],
      default: 'local',
    },
    // Biometric authentication
    biometricEnabled: {
      type: Boolean,
      default: false,
    },
    biometricType: {
      type: String,
      enum: ['fingerprint', 'faceid', 'voice', 'iris', 'none'],
      default: 'none',
    },
    // Device trust
    trustedDevices: [
      {
        deviceId: String,
        deviceName: String,
        lastUsed: Date,
      },
    ],
    // Reputation and verification
    reputationScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    reputationLevel: {
      type: String,
      enum: ['newbie', 'member', 'trusted', 'expert', 'legendary'],
      default: 'newbie',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationType: {
      type: String,
      enum: ['email', 'phone', 'document', 'none'],
      default: 'none',
    },
    // Privacy and settings
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['public', 'followers', 'private'],
        default: 'public',
      },
      showEmail: { type: Boolean, default: false },
      showActivity: { type: Boolean, default: true },
      allowMessages: { type: String, enum: ['everyone', 'followers', 'none'], default: 'everyone' },
      allowTags: { type: Boolean, default: true },
    },
    // GDPR/CCPA compliance
    gdprConsent: {
      type: Boolean,
      default: false,
    },
    gdprConsentDate: Date,
    dataProcessingConsent: {
      type: Boolean,
      default: false,
    },
    marketingOptIn: {
      type: Boolean,
      default: false,
    },
    // Account security
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    // Activity tracking
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    activityLog: [
      {
        action: String,
        timestamp: { type: Date, default: Date.now },
        ipAddress: String,
        userAgent: String,
      },
    ],
    // Early access and special flags
    isEarlyAccess: {
      type: Boolean,
      default: false,
    },
    isBetaTester: {
      type: Boolean,
      default: false,
    },
    // Account status
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deactivated', 'deleted'],
      default: 'active',
    },
    suspensionReason: String,
    suspensionUntil: Date,
    // Delegated permissions
    delegatedPermissions: [
      {
        type: String,
        enum: ['moderation', 'content', 'analytics', 'settings'],
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Critical indexes for unlimited scalability
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ provider: 1 });
userSchema.index({ reputationScore: -1 });
userSchema.index({ reputationLevel: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ lastActivity: -1 });
userSchema.index({ isActive: 1, role: 1 }); // For admin queries

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Virtual for posts count
userSchema.virtual('postsCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
  count: true,
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.generateToken({
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
  });
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const token = jwt.generateEmailVerificationToken({
    id: this._id,
    email: this.email,
  });
  this.emailVerificationToken = token;
  return token;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const token = jwt.generatePasswordResetToken({
    id: this._id,
    email: this.email,
  });
  this.passwordResetToken = token;
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return token;
};

// Method to remove sensitive data from user object
userSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

// Static method to find user by email or username
userSchema.statics.findByEmailOrUsername = function (identifier) {
  return this.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;

