const mongoose = require('mongoose');

/**
 * Mobile Session Schema
 * For cross-platform synchronization
 */
const mobileSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    device: {
      deviceId: {
        type: String,
        required: true,
        index: true,
      },
      platform: {
        type: String,
        enum: ['ios', 'android', 'web', 'pwa'],
        required: true,
      },
      appVersion: String,
      osVersion: String,
      deviceModel: String,
    },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastSync: {
      type: Date,
      default: Date.now,
      index: true,
    },
    syncedData: {
      bookmarks: { type: Boolean, default: false },
      drafts: { type: Boolean, default: false },
      settings: { type: Boolean, default: false },
      progress: { type: Boolean, default: false },
    },
    offlineCache: {
      enabled: { type: Boolean, default: true },
      lastUpdated: Date,
      size: Number, // in bytes
    },
    location: {
      country: String,
      region: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
mobileSessionSchema.index({ user: 1, device: 1 }, { unique: true });
mobileSessionSchema.index({ sessionToken: 1 }, { unique: true });
mobileSessionSchema.index({ lastSync: -1 });

const MobileSession = mongoose.model('MobileSession', mobileSessionSchema);

module.exports = MobileSession;

