const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * API Token Schema
 * For API tokens for developers
 */
const apiTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: [100, 'Token name cannot exceed 100 characters'],
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      select: false,
    },
    scopes: [
      {
        type: String,
        enum: ['read', 'write', 'delete', 'admin'],
      },
    ],
    permissions: {
      posts: {
        read: { type: Boolean, default: true },
        write: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      users: {
        read: { type: Boolean, default: false },
        write: { type: Boolean, default: false },
      },
      analytics: {
        read: { type: Boolean, default: false },
      },
    },
    rateLimit: {
      requests: { type: Number, default: 100 },
      window: { type: Number, default: 3600 }, // in seconds
    },
    lastUsed: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    usage: {
      requests: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
apiTokenSchema.index({ user: 1, isActive: 1 });
apiTokenSchema.index({ token: 1 }, { unique: true });
apiTokenSchema.index({ expiresAt: 1 });

// Generate token before save
apiTokenSchema.pre('save', async function (next) {
  if (this.isNew && !this.token) {
    this.token = `gidi_${crypto.randomBytes(32).toString('hex')}`;
    this.tokenHash = crypto.createHash('sha256').update(this.token).digest('hex');
  }
  next();
});

const APIToken = mongoose.model('APIToken', apiTokenSchema);

module.exports = APIToken;

