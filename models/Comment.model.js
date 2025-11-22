const mongoose = require('mongoose');

/**
 * Comment Schema
 */
const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Comment must belong to a post'],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment must have an author'],
      index: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null, // null for top-level comments
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    isSpam: {
      type: Boolean,
      default: false,
    },
    // AI moderation
    aiModerationScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    toxicityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },
    // Engagement
    engagementScore: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    // Versioning
    editHistory: [
      {
        content: String,
        editedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    // Media attachments
    attachments: [
      {
        type: {
          type: String,
          enum: ['image', 'video', 'audio', 'file'],
        },
        url: String,
        thumbnail: String,
        filename: String,
        size: Number,
      },
    ],
    // Mentions
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Hashtags
    hashtags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hashtag',
      },
    ],
    // Reactions (beyond likes)
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        type: {
          type: String,
          enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'support'],
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // Pinned comments
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pinnedAt: Date,
    // Community voting
    votes: {
      upvotes: { type: Number, default: 0 },
      downvotes: { type: Number, default: 0 },
    },
    // Reporting
    reports: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: String,
        reportedAt: { type: Date, default: Date.now },
      },
    ],
    reportsCount: {
      type: Number,
      default: 0,
    },
    // Visibility
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ post: 1, isApproved: 1, isSpam: 1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ isApproved: 1, isSpam: 1 });
commentSchema.index({ aiModerationScore: -1 });
commentSchema.index({ toxicityScore: -1 });
commentSchema.index({ sentiment: 1 });
commentSchema.index({ engagementScore: -1 });
commentSchema.index({ isPinned: 1, createdAt: -1 });
commentSchema.index({ 'votes.upvotes': -1 });
commentSchema.index({ reportsCount: -1 });

// Virtual for replies (nested comments)
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
});

// Virtual for reply count
commentSchema.virtual('replyCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
  count: true,
});

// Pre-save middleware to update comment count on post
commentSchema.pre('save', async function (next) {
  if (this.isNew && this.isApproved) {
    await mongoose.model('Post').findByIdAndUpdate(this.post, {
      $inc: { commentsCount: 1 },
    });
  }
  next();
});

// Pre-remove middleware to update comment count on post
commentSchema.pre('remove', async function (next) {
  if (this.isApproved) {
    await mongoose.model('Post').findByIdAndUpdate(this.post, {
      $inc: { commentsCount: -1 },
    });
  }
  next();
});

// Method to toggle like
commentSchema.methods.toggleLike = async function (userId) {
  const index = this.likes.indexOf(userId);
  if (index > -1) {
    this.likes.splice(index, 1);
  } else {
    this.likes.push(userId);
  }
  await this.save();
  return this.likes.length;
};

// Method to mark as edited
commentSchema.methods.markAsEdited = async function () {
  this.isEdited = true;
  await this.save();
};

// Static method to find approved comments
commentSchema.statics.findApproved = function (query = {}) {
  return this.find({
    ...query,
    isApproved: true,
    isSpam: false,
  });
};

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;

