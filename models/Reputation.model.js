const mongoose = require('mongoose');

/**
 * Reputation Schema
 * For user reputation and credibility scores
 */
const reputationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    level: {
      type: String,
      enum: ['newbie', 'member', 'trusted', 'expert', 'legendary'],
      default: 'newbie',
      index: true,
    },
    factors: {
      postsQuality: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
      communityContribution: { type: Number, default: 0 },
      verificationStatus: { type: Number, default: 0 },
      accountAge: { type: Number, default: 0 },
      positiveInteractions: { type: Number, default: 0 },
      negativeInteractions: { type: Number, default: 0 },
    },
    badges: [
      {
        badge: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Badge',
        },
        earnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    achievements: [
      {
        achievement: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Achievement',
        },
        earnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    history: [
      {
        action: String,
        points: Number,
        reason: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
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
reputationSchema.index({ user: 1 }, { unique: true });
reputationSchema.index({ score: -1 });
reputationSchema.index({ level: 1, score: -1 });
reputationSchema.index({ lastUpdated: -1 });

// Method to update reputation
reputationSchema.methods.updateReputation = async function (action, points, reason) {
  this.score += points;
  this.history.push({
    action,
    points,
    reason,
    timestamp: new Date(),
  });
  
  // Update level based on score
  if (this.score >= 10000) this.level = 'legendary';
  else if (this.score >= 5000) this.level = 'expert';
  else if (this.score >= 1000) this.level = 'trusted';
  else if (this.score >= 100) this.level = 'member';
  else this.level = 'newbie';
  
  this.lastUpdated = new Date();
  await this.save();
  return this;
};

const Reputation = mongoose.model('Reputation', reputationSchema);

module.exports = Reputation;

