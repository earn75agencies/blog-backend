const mongoose = require('mongoose');

/**
 * Subscription Schema
 * For multi-tier subscriptions (free → platinum → enterprise)
 */
const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['free', 'basic', 'pro', 'platinum', 'enterprise'],
      default: 'free',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'trial', 'pending'],
      default: 'active',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: Date,
    renewalDate: Date,
    autoRenew: {
      type: Boolean,
      default: true,
    },
    payment: {
      amount: Number,
      currency: {
        type: String,
        default: 'USD',
      },
      interval: {
        type: String,
        enum: ['monthly', 'yearly', 'lifetime'],
        default: 'monthly',
      },
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
      },
      lastPaymentDate: Date,
      nextPaymentDate: Date,
    },
    features: {
      postsLimit: { type: Number, default: -1 }, // -1 for unlimited
      storageLimit: { type: Number, default: 100 }, // in MB
      analytics: { type: Boolean, default: false },
      advancedTools: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      customDomain: { type: Boolean, default: false },
      adFree: { type: Boolean, default: false },
      revenueShare: { type: Number, default: 0 },
      apiAccess: { type: Boolean, default: false },
    },
    trial: {
      isTrial: { type: Boolean, default: false },
      trialEndsAt: Date,
      trialDays: { type: Number, default: 14 },
    },
    cancellation: {
      cancelledAt: Date,
      reason: String,
      feedback: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
subscriptionSchema.index({ user: 1 }, { unique: true });
subscriptionSchema.index({ tier: 1, status: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ renewalDate: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
