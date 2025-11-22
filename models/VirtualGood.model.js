const mongoose = require('mongoose');

/**
 * Virtual Goods Schema
 * For marketplace for virtual goods & NFTs
 */
const virtualGoodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: ['avatar', 'skin', 'badge', 'effect', 'theme', 'tool', 'nft', 'collectible'],
      required: true,
      index: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    image: {
      type: String,
      required: true,
    },
    preview: [String],
    pricing: {
      type: {
        type: String,
        enum: ['free', 'tokens', 'points', 'cash', 'nft'],
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
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    supply: {
      total: { type: Number, default: -1 }, // -1 for unlimited
      available: { type: Number, default: -1 },
      sold: { type: Number, default: 0 },
    },
    nftData: {
      tokenId: String,
      contractAddress: String,
      blockchain: {
        type: String,
        enum: ['ethereum', 'polygon', 'solana', 'binance'],
      },
    },
    usage: {
      type: String,
      enum: ['avatar', 'profile', 'post', 'comment', 'global'],
    },
    category: String,
    tags: [String],
    sales: {
      total: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
virtualGoodSchema.index({ slug: 1 }, { unique: true });
virtualGoodSchema.index({ creator: 1, createdAt: -1 });
virtualGoodSchema.index({ type: 1, isActive: 1 });
virtualGoodSchema.index({ rarity: 1, 'sales.revenue': -1 });
virtualGoodSchema.index({ isFeatured: 1, createdAt: -1 });
virtualGoodSchema.index({ 'sales.revenue': -1 });

const VirtualGood = mongoose.model('VirtualGood', virtualGoodSchema);

module.exports = VirtualGood;

