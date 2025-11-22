const mongoose = require('mongoose');

/**
 * View/Visit Schema for analytics
 */
const viewSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ip: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
    referrer: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    browser: {
      type: String,
      default: null,
    },
    os: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
viewSchema.index({ post: 1, createdAt: -1 });
viewSchema.index({ user: 1, createdAt: -1 });
viewSchema.index({ ip: 1, createdAt: -1 });
viewSchema.index({ createdAt: -1 });

// Compound index for unique views (prevent duplicate views from same IP/user)
viewSchema.index({ post: 1, ip: 1, createdAt: -1 });
viewSchema.index({ post: 1, user: 1, createdAt: -1 });

const View = mongoose.model('View', viewSchema);

module.exports = View;

