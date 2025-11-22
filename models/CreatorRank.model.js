const mongoose = require('mongoose');

/**
 * Creator Rank Schema
 * For tiered creator ranks (bronze → diamond)
 */
const creatorRankSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    rank: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'bronze',
      index: true,
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    requirements: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        bronze: { xp: 0, posts: 0, followers: 0 },
        silver: { xp: 1000, posts: 10, followers: 100 },
        gold: { xp: 5000, posts: 50, followers: 500 },
        platinum: { xp: 20000, posts: 200, followers: 2000 },
        diamond: { xp: 100000, posts: 1000, followers: 10000 },
      },
    },
    benefits: {
      monetizationAccess: { type: Boolean, default: false },
      advancedTools: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      exclusiveFeatures: [String],
      revenueShare: { type: Number, default: 0 },
    },
    unlockedTools: [String],
    unlockedFeatures: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
creatorRankSchema.index({ user: 1 }, { unique: true });
creatorRankSchema.index({ rank: 1, xp: -1 });
creatorRankSchema.index({ level: -1 });

// Method to add XP
creatorRankSchema.methods.addXP = async function (amount) {
  this.xp += amount;
  
  // Check for level up
  const newLevel = Math.floor(this.xp / 1000) + 1;
  if (newLevel > this.level) {
    this.level = newLevel;
  }
  
  // Update rank based on XP and stats
  await this.updateRank();
  await this.save();
  return this;
};

// Method to update rank
creatorRankSchema.methods.updateRank = async function () {
  const User = mongoose.model('User');
  const Post = mongoose.model('Post');
  
  const user = await User.findById(this.user);
  const postsCount = await Post.countDocuments({ author: this.user, status: 'published' });
  const followersCount = user?.followers?.length || 0;
  
  if (this.xp >= this.requirements.diamond.xp && 
      postsCount >= this.requirements.diamond.posts && 
      followersCount >= this.requirements.diamond.followers) {
    this.rank = 'diamond';
    this.benefits = {
      monetizationAccess: true,
      advancedTools: true,
      prioritySupport: true,
      exclusiveFeatures: ['all'],
      revenueShare: 0.9,
    };
  } else if (this.xp >= this.requirements.platinum.xp && 
             postsCount >= this.requirements.platinum.posts && 
             followersCount >= this.requirements.platinum.followers) {
    this.rank = 'platinum';
    this.benefits = {
      monetizationAccess: true,
      advancedTools: true,
      prioritySupport: true,
      exclusiveFeatures: ['advanced-analytics', 'priority-support'],
      revenueShare: 0.85,
    };
  } else if (this.xp >= this.requirements.gold.xp && 
             postsCount >= this.requirements.gold.posts && 
             followersCount >= this.requirements.gold.followers) {
    this.rank = 'gold';
    this.benefits = {
      monetizationAccess: true,
      advancedTools: true,
      prioritySupport: false,
      exclusiveFeatures: ['advanced-analytics'],
      revenueShare: 0.8,
    };
  } else if (this.xp >= this.requirements.silver.xp && 
             postsCount >= this.requirements.silver.posts && 
             followersCount >= this.requirements.silver.followers) {
    this.rank = 'silver';
    this.benefits = {
      monetizationAccess: true,
      advancedTools: false,
      prioritySupport: false,
      exclusiveFeatures: [],
      revenueShare: 0.75,
    };
  } else {
    this.rank = 'bronze';
    this.benefits = {
      monetizationAccess: false,
      advancedTools: false,
      prioritySupport: false,
      exclusiveFeatures: [],
      revenueShare: 0.7,
    };
  }
};

const CreatorRank = mongoose.model('CreatorRank', creatorRankSchema);

module.exports = CreatorRank;

