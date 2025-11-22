const mongoose = require('mongoose');

/**
 * Offline Cache Schema
 * For offline content access & caching
 */
const offlineCacheSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    device: {
      deviceId: String,
      platform: String,
    },
    content: {
      type: {
        type: String,
        enum: ['post', 'series', 'course', 'media', 'event'],
        required: true,
      },
      contentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
      },
    },
    cachedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: Date,
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    size: {
      type: Number, // in bytes
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    lastAccessed: {
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
offlineCacheSchema.index({ user: 1, 'content.contentId': 1, 'content.type': 1 });
offlineCacheSchema.index({ expiresAt: 1 });
offlineCacheSchema.index({ lastAccessed: -1 });

const OfflineCache = mongoose.model('OfflineCache', offlineCacheSchema);

module.exports = OfflineCache;

