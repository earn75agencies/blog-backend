const mongoose = require('mongoose');

/**
 * Analytics Event Schema
 * For detailed analytics tracking
 */
const analyticsEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    label: {
      type: String,
    },
    value: {
      type: Number,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    page: {
      type: String,
    },
    referrer: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    device: {
      type: {
        type: String,
        enum: ['desktop', 'tablet', 'mobile', 'other'],
      },
      os: String,
      browser: String,
    },
    location: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
analyticsEventSchema.index({ event: 1, createdAt: -1 });
analyticsEventSchema.index({ category: 1, createdAt: -1 });
analyticsEventSchema.index({ user: 1, createdAt: -1 });
analyticsEventSchema.index({ sessionId: 1, createdAt: -1 });
analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ page: 1, createdAt: -1 });
analyticsEventSchema.index({ 'location.country': 1, createdAt: -1 });

// TTL index to auto-delete old events after 365 days
// analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

module.exports = AnalyticsEvent;

