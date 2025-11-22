const mongoose = require('mongoose');

/**
 * Affiliate Marketing Schema
 * For affiliate marketing integration per post
 */
const affiliateSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    program: {
      name: {
        type: String,
        required: true,
      },
      provider: {
        type: String,
        enum: ['amazon', 'shopify', 'custom', 'other'],
      },
      affiliateId: {
        type: String,
        required: true,
      },
      trackingUrl: {
        type: String,
        required: true,
      },
    },
    products: [
      {
        name: String,
        url: String,
        image: String,
        price: Number,
        currency: String,
        commission: {
          type: Number, // percentage
          default: 0,
        },
        position: {
          type: Number,
          default: 0,
        },
      },
    ],
    stats: {
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      commission: { type: Number, default: 0 },
    },
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
affiliateSchema.index({ post: 1 }, { unique: true });
affiliateSchema.index({ author: 1, createdAt: -1 });
affiliateSchema.index({ isActive: 1, createdAt: -1 });
affiliateSchema.index({ 'stats.revenue': -1 });

const Affiliate = mongoose.model('Affiliate', affiliateSchema);

module.exports = Affiliate;

