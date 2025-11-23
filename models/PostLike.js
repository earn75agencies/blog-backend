const mongoose = require('mongoose');

/**
 * PostLike Schema - Separate collection for scalable like tracking
 * Recommended for production when you have 1000+ likes per post
 */
const postLikeSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one like per user per post
postLikeSchema.index({ post: 1, user: 1 }, { unique: true });

// Index for getting all users who liked a post
postLikeSchema.index({ post: 1, createdAt: -1 });

// Index for getting all posts liked by a user
postLikeSchema.index({ user: 1, createdAt: -1 });

// Static method to check if user liked a post
postLikeSchema.statics.hasUserLiked = async function (postId, userId) {
  const like = await this.findOne({ post: postId, user: userId });
  return !!like;
};

// Static method to get users who liked a post
postLikeSchema.statics.getUsersWhoLiked = function (postId, options = {}) {
  const limit = options.limit || 20;
  const skip = options.skip || 0;

  return this.find({ post: postId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name username avatar')
    .lean();
};

// Static method to get posts liked by a user
postLikeSchema.statics.getPostsLikedByUser = function (userId, options = {}) {
  const limit = options.limit || 20;
  const skip = options.skip || 0;

  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('post')
    .lean();
};

// Static method to count likes for a post
postLikeSchema.statics.countLikes = function (postId) {
  return this.countDocuments({ post: postId });
};

const PostLike = mongoose.model('PostLike', postLikeSchema);

module.exports = PostLike;