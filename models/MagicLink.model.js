const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Magic Link Schema
 * For passwordless login via magic link
 */
const magicLinkSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    purpose: {
      type: String,
      enum: ['login', 'signup', 'email-verification'],
      default: 'login',
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: Date,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
magicLinkSchema.index({ token: 1 }, { unique: true });
magicLinkSchema.index({ email: 1, expiresAt: 1 });
magicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Generate token before save
magicLinkSchema.pre('save', async function (next) {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }
  next();
});

const MagicLink = mongoose.model('MagicLink', magicLinkSchema);

module.exports = MagicLink;

