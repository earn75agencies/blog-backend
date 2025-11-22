const mongoose = require('mongoose');

/**
 * Leaderboard Schema
 * For tracking user rankings and points
 */
const leaderboardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['posts', 'comments', 'likes', 'followers', 'views', 'engagement', 'overall'],
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'all-time'],
      required: true,
      index: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
    },
    previousRank: {
      type: Number,
    },
    stats: {
      postsCount: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      likesCount: { type: Number, default: 0 },
      followersCount: { type: Number, default: 0 },
      viewsCount: { type: Number, default: 0 },
      engagementScore: { type: Number, default: 0 },
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
leaderboardSchema.index({ category: 1, period: 1, points: -1 });
leaderboardSchema.index({ category: 1, period: 1, rank: 1 });
leaderboardSchema.index({ user: 1, category: 1, period: 1 }, { unique: true });
leaderboardSchema.index({ updatedAt: -1 });

// Method to update points
leaderboardSchema.methods.updatePoints = async function (newPoints, stats = {}) {
  this.previousRank = this.rank;
  this.points = newPoints;
  
  Object.keys(stats).forEach(key => {
    if (this.stats[key] !== undefined) {
      this.stats[key] = stats[key];
    }
  });
  
  this.updatedAt = new Date();
  await this.save();
  
  return this;
};

// Static method to recalculate ranks
leaderboardSchema.statics.recalculateRanks = async function (category, period) {
  const entries = await this.find({ category, period })
    .sort({ points: -1 })
    .lean();
  
  const updatePromises = entries.map((entry, index) => {
    return this.updateOne(
      { _id: entry._id },
      { $set: { rank: index + 1 } }
    );
  });
  
  await Promise.all(updatePromises);
  
  return entries.length;
};

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

module.exports = Leaderboard;

