const mongoose = require('mongoose');

/**
 * Referral Schema
 * For tracking referrals and rewards
 */
const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referred: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['user', 'creator', 'course', 'product', 'event'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'rewarded', 'expired'],
      default: 'pending',
    },
    reward: {
      type: {
        type: String,
        enum: ['points', 'credits', 'discount', 'badge', 'subscription'],
      },
      value: Number,
      currency: String,
    },
    rewardedAt: Date,
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
referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ referred: 1 });
referralSchema.index({ code: 1 }, { unique: true });

const Referral = mongoose.model('Referral', referralSchema);

module.exports = Referral;

