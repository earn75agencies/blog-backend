const mongoose = require('mongoose');

/**
 * Hashtag Schema
 * For tracking hashtags across posts and comments
 */
const hashtagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hashtag name is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
    ],
    postsCount: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    commentsCount: {
      type: Number,
      default: 0,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    followersCount: {
      type: Number,
      default: 0,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    trendingScore: {
      type: Number,
      default: 0,
    },
    lastTrendingAt: {
      type: Date,
    },
    // Analytics
    analytics: {
      usageCount: { type: Number, default: 0 },
      engagementScore: { type: Number, default: 0 },
      sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
        default: 'neutral',
      },
      sentimentScore: { type: Number, default: 0 },
      regionalTrends: [
        {
          region: String,
          score: Number,
          postsCount: Number,
        },
      ],
      influenceScore: { type: Number, default: 0 },
      viralityScore: { type: Number, default: 0 },
    },
    // Categories
    category: {
      type: String,
      enum: ['general', 'tech', 'lifestyle', 'business', 'entertainment', 'news', 'sports', 'other'],
      default: 'general',
    },
    // Campaigns
    campaign: {
      isCampaign: { type: Boolean, default: false },
      campaignName: String,
      startDate: Date,
      endDate: Date,
      goal: Number,
      current: Number,
    },
    // Branding
    isBranded: {
      type: Boolean,
      default: false,
    },
    brandOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Subscriptions
    subscribers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    subscribersCount: {
      type: Number,
      default: 0,
    },
    // Privacy & Moderation
    isModerated: {
      type: Boolean,
      default: false,
    },
    spamScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
hashtagSchema.index({ name: 1 }, { unique: true });
hashtagSchema.index({ postsCount: -1 });
hashtagSchema.index({ followersCount: -1 });
hashtagSchema.index({ trendingScore: -1 });
hashtagSchema.index({ isTrending: 1, trendingScore: -1 });
hashtagSchema.index({ createdAt: -1 });
hashtagSchema.index({ category: 1, trendingScore: -1 });
hashtagSchema.index({ 'analytics.influenceScore': -1 });
hashtagSchema.index({ 'analytics.viralityScore': -1 });
hashtagSchema.index({ isBranded: 1 });
hashtagSchema.index({ subscribersCount: -1 });

// Method to add post
hashtagSchema.methods.addPost = async function (postId) {
  if (!this.posts.includes(postId)) {
    this.posts.push(postId);
    this.postsCount += 1;
    await this.updateTrendingScore();
    await this.save();
  }
  return this;
};

// Method to remove post
hashtagSchema.methods.removePost = async function (postId) {
  const index = this.posts.indexOf(postId);
  if (index > -1) {
    this.posts.splice(index, 1);
    this.postsCount -= 1;
    await this.updateTrendingScore();
    await this.save();
  }
  return this;
};

// Method to add comment
hashtagSchema.methods.addComment = async function (commentId) {
  if (!this.comments.includes(commentId)) {
    this.comments.push(commentId);
    this.commentsCount += 1;
    await this.updateTrendingScore();
    await this.save();
  }
  return this;
};

// Method to remove comment
hashtagSchema.methods.removeComment = async function (commentId) {
  const index = this.comments.indexOf(commentId);
  if (index > -1) {
    this.comments.splice(index, 1);
    this.commentsCount -= 1;
    await this.updateTrendingScore();
    await this.save();
  }
  return this;
};

// Method to follow hashtag
hashtagSchema.methods.follow = async function (userId) {
  if (!this.followers.includes(userId)) {
    this.followers.push(userId);
    this.followersCount += 1;
    await this.save();
  }
  return this;
};

// Method to unfollow hashtag
hashtagSchema.methods.unfollow = async function (userId) {
  const index = this.followers.indexOf(userId);
  if (index > -1) {
    this.followers.splice(index, 1);
    this.followersCount -= 1;
    await this.save();
  }
  return this;
};

// Method to update trending score
hashtagSchema.methods.updateTrendingScore = async function () {
  // Calculate trending score based on recent activity
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Weight recent posts more heavily
  const recentPostsCount = await mongoose.model('Post').countDocuments({
    _id: { $in: this.posts },
    createdAt: { $gte: oneDayAgo },
  });

  const recentCommentsCount = await mongoose.model('Comment').countDocuments({
    _id: { $in: this.comments },
    createdAt: { $gte: oneDayAgo },
  });

  // Calculate score: posts * 2 + comments * 1 + followers * 0.5
  this.trendingScore = 
    (this.postsCount * 2) + 
    (this.commentsCount * 1) + 
    (this.followersCount * 0.5) +
    (recentPostsCount * 5) +
    (recentCommentsCount * 2);

  // Mark as trending if score > 50
  if (this.trendingScore > 50 && !this.isTrending) {
    this.isTrending = true;
    this.lastTrendingAt = new Date();
  } else if (this.trendingScore <= 50 && this.isTrending) {
    this.isTrending = false;
  }

  return this.trendingScore;
};

const Hashtag = mongoose.model('Hashtag', hashtagSchema);

module.exports = Hashtag;

