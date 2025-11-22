const mongoose = require('mongoose');

/**
 * Newsletter Subscription Schema
 */
const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    status: {
      type: String,
      enum: ['subscribed', 'unsubscribed', 'bounced', 'complained'],
      default: 'subscribed',
      index: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: Date,
    unsubscribeToken: {
      type: String,
      select: false,
    },
    source: {
      type: String,
      enum: ['website', 'api', 'import', 'admin'],
      default: 'website',
    },
    tags: [String], // For segmentation
    metadata: {
      ipAddress: String,
      userAgent: String,
      referrer: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ status: 1, subscribedAt: -1 });
newsletterSchema.index({ user: 1 });

const Newsletter = mongoose.model('Newsletter', newsletterSchema);

module.exports = Newsletter;

