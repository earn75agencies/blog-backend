const mongoose = require('mongoose');

/**
 * Push Subscription Schema
 * For web and mobile push notifications
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['web', 'ios', 'android'],
      required: true,
      index: true,
    },
    endpoint: {
      type: String, // For web push
    },
    keys: {
      p256dh: String,
      auth: String,
    },
    deviceToken: {
      type: String, // For mobile push
      index: true,
    },
    deviceInfo: {
      platform: String,
      model: String,
      osVersion: String,
      appVersion: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    preferences: {
      postNotifications: { type: Boolean, default: true },
      commentNotifications: { type: Boolean, default: true },
      messageNotifications: { type: Boolean, default: true },
      marketingNotifications: { type: Boolean, default: false },
    },
    lastUsed: {
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
pushSubscriptionSchema.index({ user: 1, type: 1, isActive: 1 });
pushSubscriptionSchema.index({ deviceToken: 1, isActive: 1 });
pushSubscriptionSchema.index({ endpoint: 1, isActive: 1 });
pushSubscriptionSchema.index({ lastUsed: -1 });

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

module.exports = PushSubscription;

