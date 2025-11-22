const mongoose = require('mongoose');

/**
 * Token Schema
 * For tokenized ecosystem with internal credits
 */
const tokenSchema = new mongoose.Schema(
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
    totalSpent: {
      type: Number,
      default: 0,
    },
    transactions: [
      {
        type: {
          type: String,
          enum: ['earn', 'spend', 'transfer', 'reward', 'purchase'],
        },
        amount: {
          type: Number,
          required: true,
        },
        reason: {
          type: String,
          maxlength: [500, 'Reason cannot exceed 500 characters'],
        },
        relatedContent: {
          contentType: String,
          contentId: mongoose.Schema.Types.ObjectId,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    earningRules: {
      postCreated: { type: Number, default: 10 },
      postLiked: { type: Number, default: 1 },
      commentCreated: { type: Number, default: 5 },
      commentLiked: { type: Number, default: 1 },
      share: { type: Number, default: 3 },
      dailyLogin: { type: Number, default: 5 },
      achievement: { type: Number, default: 50 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
tokenSchema.index({ user: 1 }, { unique: true });
tokenSchema.index({ balance: -1 });
tokenSchema.index({ totalEarned: -1 });

// Method to earn tokens
tokenSchema.methods.earn = async function (amount, reason, relatedContent = null) {
  this.balance += amount;
  this.totalEarned += amount;
  this.transactions.push({
    type: 'earn',
    amount,
    reason,
    relatedContent,
    timestamp: new Date(),
  });
  await this.save();
  return this;
};

// Method to spend tokens
tokenSchema.methods.spend = async function (amount, reason, relatedContent = null) {
  if (this.balance < amount) {
    throw new Error('Insufficient token balance');
  }
  this.balance -= amount;
  this.totalSpent += amount;
  this.transactions.push({
    type: 'spend',
    amount: -amount,
    reason,
    relatedContent,
    timestamp: new Date(),
  });
  await this.save();
  return this;
};

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;

