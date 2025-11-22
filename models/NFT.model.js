const mongoose = require('mongoose');

/**
 * NFT Schema
 * For NFT-based content ownership and sales
 */
const nftSchema = new mongoose.Schema(
  {
    content: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['post', 'series', 'course', 'video', 'illustration'],
      required: true,
      index: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    contractAddress: {
      type: String,
      index: true,
    },
    blockchain: {
      type: String,
      enum: ['ethereum', 'polygon', 'solana', 'binance', 'other'],
      default: 'ethereum',
    },
    metadata: {
      name: String,
      description: String,
      image: String,
      attributes: [
        {
          trait_type: String,
          value: mongoose.Schema.Types.Mixed,
        },
      ],
      external_url: String,
    },
    ownership: {
      currentOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
      ownershipHistory: [
        {
          owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          transactionHash: String,
          price: {
            type: Number,
          },
          currency: {
            type: String,
            default: 'ETH',
          },
          acquiredAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    pricing: {
      initialPrice: {
        type: Number,
        required: true,
      },
      currentPrice: {
        type: Number,
      },
      currency: {
        type: String,
        default: 'ETH',
      },
      royalty: {
        type: Number,
        default: 10, // percentage
        min: 0,
        max: 50,
      },
    },
    status: {
      type: String,
      enum: ['minting', 'minted', 'listed', 'sold', 'transferred', 'burned'],
      default: 'minting',
      index: true,
    },
    mintedAt: {
      type: Date,
    },
    soldAt: {
      type: Date,
    },
    transactionHash: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
nftSchema.index({ tokenId: 1 }, { unique: true, sparse: true });
nftSchema.index({ creator: 1, createdAt: -1 });
nftSchema.index({ 'ownership.currentOwner': 1 });
nftSchema.index({ status: 1, createdAt: -1 });
nftSchema.index({ blockchain: 1, status: 1 });
nftSchema.index({ createdAt: -1 });

const NFT = mongoose.model('NFT', nftSchema);

module.exports = NFT;

