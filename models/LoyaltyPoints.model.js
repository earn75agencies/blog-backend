const mongoose = require('mongoose');

/**
 * Loyalty Points Schema
 * For loyalty points system
 */
const loyaltyPointsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    totalRedeemed: {
      type: Number,
      default: 0,
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'bronze',
      index: true,
    },
    transactions: [
      {
        type: {
          type: String,
          enum: ['earn', 'redeem', 'expire', 'bonus', 'penalty'],
        },
        amount: Number,
        reason: String,
        relatedContent: {
          contentType: String,
          contentId: mongoose.Schema.Types.ObjectId,
        },
        expiresAt: Date,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastActivity: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
loyaltyPointsSchema.index({ user: 1 }, { unique: true });
loyaltyPointsSchema.index({ balance: -1 });
loyaltyPointsSchema.index({ tier: 1, balance: -1 });

// Method to earn points
loyaltyPointsSchema.methods.earn = async function (amount, reason, relatedContent = null) {
  this.balance += amount;
  this.totalEarned += amount;
  this.transactions.push({
    type: 'earn',
    amount,
    reason,
    relatedContent,
    timestamp: new Date(),
  });
  
  // Update tier
  this.updateTier();
  
  await this.save();
  return this;
};

// Method to redeem points
loyaltyPointsSchema.methods.redeem = async function (amount, reason) {
  if (this.balance < amount) {
    throw new Error('Insufficient loyalty points');
  }
  this.balance -= amount;
  this.totalRedeemed += amount;
  this.transactions.push({
    type: 'redeem',
    amount: -amount,
    reason,
    timestamp: new Date(),
  });
  await this.save();
  return this;
};

// Method to update tier
loyaltyPointsSchema.methods.updateTier = function () {
  if (this.totalEarned >= 100000) this.tier = 'diamond';
  else if (this.totalEarned >= 50000) this.tier = 'platinum';
  else if (this.totalEarned >= 10000) this.tier = 'gold';
  else if (this.totalEarned >= 1000) this.tier = 'silver';
  else this.tier = 'bronze';
};

const LoyaltyPoints = mongoose.model('LoyaltyPoints', loyaltyPointsSchema);

module.exports = LoyaltyPoints;

