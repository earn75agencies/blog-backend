const mongoose = require('mongoose');

/**
 * Group/Community Schema
 * For creating community groups and sub-blogs
 */
const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
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
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        role: {
          type: String,
          enum: ['member', 'moderator', 'admin'],
          default: 'member',
        },
      },
    ],
    membersCount: {
      type: Number,
      default: 0,
    },
    avatar: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    category: {
      type: String,
      enum: ['general', 'tech', 'lifestyle', 'business', 'education', 'entertainment', 'other'],
      default: 'general',
    },
    tags: [String],
    isPublic: {
      type: Boolean,
      default: true,
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    pendingMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
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
    rules: [String],
    settings: {
      allowMemberPosts: { type: Boolean, default: true },
      allowMemberComments: { type: Boolean, default: true },
      requireModeration: { type: Boolean, default: false },
      maxMembers: { type: Number },
      allowVoting: { type: Boolean, default: true },
      allowScheduledPosts: { type: Boolean, default: true },
      requireReputation: { type: Boolean, default: false },
      minReputation: { type: Number, default: 0 },
    },
    // Voting system
    votingEnabled: {
      type: Boolean,
      default: true,
    },
    voteTypes: [
      {
        type: String,
        enum: ['upvote', 'downvote', 'approve', 'reject', 'priority'],
      },
    ],
    // Tier system
    hasTiers: {
      type: Boolean,
      default: false,
    },
    defaultTier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityTier',
    },
    // Reputation-based access
    reputationBasedAccess: {
      type: Boolean,
      default: false,
    },
    minReputationForPost: {
      type: Number,
      default: 0,
    },
    minReputationForComment: {
      type: Number,
      default: 0,
    },
    // Scheduled posts
    scheduledPostsCount: {
      type: Number,
      default: 0,
    },
    // Analytics
    analytics: {
      totalViews: { type: Number, default: 0 },
      totalEngagement: { type: Number, default: 0 },
      averageEngagement: { type: Number, default: 0 },
      growthRate: { type: Number, default: 0 },
      lastCalculated: Date,
    },
    // Community features
    features: {
      hasLeaderboard: { type: Boolean, default: true },
      hasChallenges: { type: Boolean, default: false },
      hasEvents: { type: Boolean, default: true },
      hasPolls: { type: Boolean, default: true },
      hasQuizzes: { type: Boolean, default: false },
    },
    // Regional targeting
    targetRegions: [String],
    targetLanguages: [String],
    // Community badges
    customBadges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Badge',
      },
    ],
    // Content series
    contentSeries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Series',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
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
groupSchema.index({ slug: 1 }, { unique: true });
groupSchema.index({ owner: 1, createdAt: -1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ category: 1, isActive: 1 });
groupSchema.index({ isPublic: 1, isActive: 1, createdAt: -1 });
groupSchema.index({ membersCount: -1 });
groupSchema.index({ postsCount: -1 });
groupSchema.index({ createdAt: -1 });
groupSchema.index({ votingEnabled: 1 });
groupSchema.index({ hasTiers: 1 });
groupSchema.index({ reputationBasedAccess: 1 });
groupSchema.index({ 'analytics.totalEngagement': -1 });
groupSchema.index({ targetRegions: 1 });

// Method to add member
groupSchema.methods.addMember = async function (userId, role = 'member') {
  const existingMember = this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  
  if (!existingMember) {
    this.members.push({
      user: userId,
      joinedAt: new Date(),
      role,
    });
    this.membersCount += 1;
    await this.save();
  }
  
  return this;
};

// Method to remove member
groupSchema.methods.removeMember = async function (userId) {
  if (userId.toString() === this.owner.toString()) {
    throw new Error('Cannot remove group owner');
  }
  
  this.members = this.members.filter(
    (m) => m.user.toString() !== userId.toString()
  );
  this.membersCount = Math.max(0, this.membersCount - 1);
  await this.save();
  
  return this;
};

// Method to add admin
groupSchema.methods.addAdmin = async function (userId) {
  if (!this.admins.includes(userId)) {
    this.admins.push(userId);
    const member = this.members.find((m) => m.user.toString() === userId.toString());
    if (member) {
      member.role = 'admin';
    }
    await this.save();
  }
  return this;
};

// Method to request to join
groupSchema.methods.requestJoin = async function (userId) {
  if (this.requiresApproval) {
    if (!this.pendingMembers.includes(userId)) {
      this.pendingMembers.push(userId);
      await this.save();
    }
    return { requiresApproval: true };
  } else {
    await this.addMember(userId);
    return { requiresApproval: false };
  }
};

// Pre-save middleware to generate slug
groupSchema.pre('save', async function (next) {
  if (this.isModified('name') && !this.slug) {
    const slugify = require('../utils/string.util').slugify;
    let slug = slugify(this.name);
    let existingGroup = await mongoose.model('Group').findOne({ slug });
    let counter = 1;
    
    while (existingGroup) {
      slug = `${slugify(this.name)}-${counter}`;
      existingGroup = await mongoose.model('Group').findOne({ slug });
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;

