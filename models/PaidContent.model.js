const mongoose = require('mongoose');

/**
 * Paid Content Schema
 * For paid article gating
 */
const paidContentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      unique: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pricing: {
      type: {
        type: String,
        enum: ['free', 'one-time', 'subscription', 'pay-per-view'],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    previewLength: {
      type: Number,
      default: 0, // percentage or character count
    },
    previewType: {
      type: String,
      enum: ['percentage', 'characters', 'paragraphs'],
      default: 'percentage',
    },
    accessRules: {
      requireLogin: { type: Boolean, default: true },
      requireSubscription: { type: Boolean, default: false },
      subscriptionTiers: [String],
      allowGift: { type: Boolean, default: false },
    },
    sales: {
      total: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      refunds: { type: Number, default: 0 },
    },
    purchasers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        purchasedAt: {
          type: Date,
          default: Date.now,
        },
        amount: Number,
        paymentId: mongoose.Schema.Types.ObjectId,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
paidContentSchema.index({ post: 1 }, { unique: true });
paidContentSchema.index({ author: 1, createdAt: -1 });
paidContentSchema.index({ isActive: 1, 'sales.revenue': -1 });
paidContentSchema.index({ 'purchasers.user': 1 });

const PaidContent = mongoose.model('PaidContent', paidContentSchema);

module.exports = PaidContent;

