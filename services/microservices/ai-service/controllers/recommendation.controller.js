const asyncHandler = require('../../../utils/asyncHandler');
const Post = require('../../../models/Post.model');
const User = require('../../../models/User.model');
const Tag = require('../../../models/Tag.model');
const aiService = require('../../../services/ai/ai.service');

/**
 * Get recommended posts
 */
exports.getRecommendedPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const userId = req.user?._id;

  // Get user's reading history if authenticated
  let userProfile = null;
  if (userId) {
    const user = await User.findById(userId);
    const userBookmarks = await require('../../../models/Bookmark.model').find({ user: userId })
      .populate('post', 'category tags')
      .limit(50);

    userProfile = {
      readCategories: [...new Set(userBookmarks.map(b => b.post?.category?.name).filter(Boolean))],
      readTags: [...new Set(userBookmarks.map(b => b.post?.tags?.map(t => t.name)).flat().filter(Boolean))],
      followedAuthors: user.following || [],
      avgReadingTime: 5,
    };
  }

  // Get available content
  const availableContent = await Post.find({
    status: 'published',
    publishedAt: { $lte: new Date() },
  })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .select('title excerpt featuredImage views likes category tags author publishedAt readingTime')
    .limit(100)
    .sort({ publishedAt: -1 })
    .lean();

  // Generate recommendations using AI service
  const recommendations = userProfile
    ? await aiService.generateRecommendations(userProfile, availableContent, limit)
    : availableContent.slice(0, limit);

  res.status(200).json({
    status: 'success',
    results: recommendations.length,
    data: {
      posts: recommendations,
    },
  });
});

/**
 * Get recommended users
 */
exports.getRecommendedUsers = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const userId = req.user?._id;

  if (!userId) {
    // If not authenticated, return popular users
    const users = await User.find({ isActive: true, role: { $in: ['author', 'admin'] } })
      .select('username avatar firstName lastName bio reputationScore')
      .sort({ reputationScore: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users,
      },
    });
  }

  // Get user's following list
  const currentUser = await User.findById(userId);
  const followingIds = currentUser.following || [];

  // Find users with similar interests or popular users
  const recommendedUsers = await User.find({
    _id: { $nin: [...followingIds, userId] },
    isActive: true,
  })
    .select('username avatar firstName lastName bio reputationScore')
    .sort({ reputationScore: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  res.status(200).json({
    status: 'success',
    results: recommendedUsers.length,
    data: {
      users: recommendedUsers,
    },
  });
});

/**
 * Get trending content
 */
exports.getTrendingContent = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const limit = parseInt(req.query.limit) || 20;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get trending posts (high views, likes, comments in recent period)
  const trendingPosts = await Post.find({
    status: 'published',
    publishedAt: { $gte: startDate },
  })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .select('title excerpt featuredImage views likes commentsCount category tags author publishedAt')
    .sort({ views: -1, likes: -1, commentsCount: -1 })
    .limit(limit)
    .lean();

  // Get trending tags
  const trendingTags = await Tag.find({})
    .sort({ usageCount: -1, createdAt: -1 })
    .limit(10)
    .select('name slug usageCount')
    .lean();

  // Get trending topics (from categories with most posts)
  const Category = require('../../../models/Category.model');
  const trendingTopics = await Category.aggregate([
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'category',
        as: 'posts',
      },
    },
    {
      $match: {
        'posts.publishedAt': { $gte: startDate },
      },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        postCount: { $size: '$posts' },
      },
    },
    {
      $sort: { postCount: -1 },
    },
    {
      $limit: 10,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      posts: trendingPosts,
      topics: trendingTopics,
      tags: trendingTags,
    },
  });
});

