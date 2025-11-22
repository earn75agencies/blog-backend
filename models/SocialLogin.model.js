const mongoose = require('mongoose');

/**
 * Social Login Schema
 * For managing social authentication providers
 */
const socialLoginSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['google', 'facebook', 'apple', 'linkedin', 'twitter', 'github'],
      required: true,
      index: true,
    },
    providerId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    profile: {
      name: String,
      picture: String,
      locale: String,
    },
    accessToken: {
      type: String,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    tokenExpiry: Date,
    isPrimary: {
      type: Boolean,
      default: false,
    },
    linkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
socialLoginSchema.index({ user: 1, provider: 1 }, { unique: true });
socialLoginSchema.index({ providerId: 1, provider: 1 }, { unique: true });
socialLoginSchema.index({ email: 1 });

const SocialLogin = mongoose.model('SocialLogin', socialLoginSchema);

module.exports = SocialLogin;

