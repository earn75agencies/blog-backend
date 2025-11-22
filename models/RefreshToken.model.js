const mongoose = require('mongoose');

/**
 * Refresh Token Schema
 * Stored in MongoDB with TTL for automatic cleanup
 * Sessions stored in Redis (separate service)
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceId: {
      type: String,
      index: true,
    },
    deviceName: String,
    ipAddress: String,
    userAgent: String,
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      expires: 0, // TTL index - auto-delete expired tokens
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: Date,
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
refreshTokenSchema.index({ user: 1, isRevoked: 1 });
refreshTokenSchema.index({ token: 1, isRevoked: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

// Static method to create refresh token
refreshTokenSchema.statics.createToken = async function (user, deviceInfo = {}) {
  const jwt = require('../config/jwt.config');
  const token = jwt.generateRefreshToken({
    id: user._id,
    username: user.username,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  const refreshToken = await this.create({
    user: user._id,
    token,
    deviceId: deviceInfo.deviceId,
    deviceName: deviceInfo.deviceName,
    ipAddress: deviceInfo.ipAddress,
    userAgent: deviceInfo.userAgent,
    expiresAt,
  });

  return refreshToken;
};

// Static method to revoke token
refreshTokenSchema.statics.revokeToken = async function (token) {
  return this.updateOne(
    { token },
    { isRevoked: true, revokedAt: new Date() }
  );
};

// Static method to revoke all user tokens
refreshTokenSchema.statics.revokeUserTokens = async function (userId) {
  return this.updateMany(
    { user: userId, isRevoked: false },
    { isRevoked: true, revokedAt: new Date() }
  );
};

// Static method to rotate token (revoke old, create new)
refreshTokenSchema.statics.rotateToken = async function (oldToken, user, deviceInfo) {
  await this.revokeToken(oldToken);
  return this.createToken(user, deviceInfo);
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;



