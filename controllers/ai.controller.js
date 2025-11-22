const aiService = require('../services/ai/ai.service');
const Post = require('../models/Post.model');
const User = require('../models/User.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get AI content suggestions for author
 * @route   GET /api/ai/suggestions
 * @access  Private/Author
 */
exports.getContentSuggestions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  // Get user's writing history
  const userPosts = await Post.find({ author: req.user._id })
    .select('category tags title excerpt views likesCount')
    .limit(50);
  
  const userData = {
    categories: [...new Set(userPosts.map(p => p.category?.name).filter(Boolean))],
    avgPostLength: userPosts.length > 0 
      ? Math.round(userPosts.reduce((sum, p) => sum + (p.excerpt?.length || 0), 0) / userPosts.length)
      : 0,
    popularTopics: userPosts
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map(p => p.title),
    targetAudience: user.bio || 'General public',
  };
  
  const suggestions = await aiService.generateContentSuggestions(userData, {});
  
  res.json({
    status: 'success',
    data: {
      suggestions,
    },
  });
});

/**
 * @desc    Get AI recommendations for reader
 * @route   GET /api/ai/recommendations
 * @access  Private
 */
exports.getRecommendations = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const user = await User.findById(req.user._id);
  
  // Get user's reading history
  const userBookmarks = await require('../models/Bookmark.model').find({ user: req.user._id })
    .populate('post', 'category tags author')
    .limit(50);
  
  const userProfile = {
    readCategories: [...new Set(userBookmarks.map(b => b.post?.category?.name).filter(Boolean))],
    readTags: [...new Set(userBookmarks.map(b => b.post?.tags?.map(t => t.name)).flat().filter(Boolean))],
    followedAuthors: user.following || [],
    avgReadingTime: 5, // minutes
    trendingTopics: [],
  };
  
  // Get available content
  const availableContent = await Post.find({
    status: 'published',
    isPublished: true,
    author: { $ne: req.user._id }, // Exclude own posts
  })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .select('title excerpt featuredImage views likesCount category tags author publishedAt')
    .limit(100)
    .sort({ publishedAt: -1 });
  
  const recommendations = await aiService.generateRecommendations(
    userProfile,
    availableContent,
    limit
  );
  
  res.json({
    status: 'success',
    results: recommendations.length,
    data: {
      recommendations,
    },
  });
});

/**
 * @desc    Auto-tag content
 * @route   POST /api/ai/auto-tag
 * @access  Private/Author
 */
exports.autoTag = asyncHandler(async (req, res) => {
  const { title, content, excerpt } = req.body;
  
  if (!title || !content) {
    throw new ErrorResponse('Title and content are required', 400);
  }
  
  const tags = await aiService.autoTagContent(title, content, excerpt || content.substring(0, 200));
  
  res.json({
    status: 'success',
    data: {
      tags,
    },
  });
});

/**
 * @desc    Analyze sentiment
 * @route   POST /api/ai/sentiment
 * @access  Private
 */
exports.analyzeSentiment = asyncHandler(async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    throw new ErrorResponse('Text is required', 400);
  }
  
  const sentiment = await aiService.analyzeSentiment(text);
  
  res.json({
    status: 'success',
    data: {
      sentiment,
    },
  });
});

/**
 * @desc    Generate SEO content
 * @route   POST /api/ai/seo
 * @access  Private/Author
 */
exports.generateSEO = asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  
  if (!title || !content) {
    throw new ErrorResponse('Title and content are required', 400);
  }
  
  const seo = await aiService.generateSEOContent(title, content);
  
  res.json({
    status: 'success',
    data: {
      seo,
    },
  });
});

/**
 * @desc    Moderate content
 * @route   POST /api/ai/moderate
 * @access  Private/Admin
 */
exports.moderateContent = asyncHandler(async (req, res) => {
  const { content, type } = req.body;
  
  if (!content) {
    throw new ErrorResponse('Content is required', 400);
  }
  
  const moderation = await aiService.moderateContent(content, type || 'post');
  
  res.json({
    status: 'success',
    data: {
      moderation,
    },
  });
});

/**
 * @desc    Get personalized dashboard
 * @route   GET /api/ai/dashboard
 * @access  Private
 */
exports.getPersonalizedDashboard = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  const userPosts = await Post.find({ author: req.user._id })
    .select('category tags title views likesCount')
    .limit(50);
  
  const userBookmarks = await require('../models/Bookmark.model').find({ user: req.user._id })
    .populate('post', 'category tags author')
    .limit(50);
  
  const userProfile = {
    categories: [...new Set(userPosts.map(p => p.category?.name).filter(Boolean))],
    avgPostLength: userPosts.length > 0 
      ? Math.round(userPosts.reduce((sum, p) => sum + (p.excerpt?.length || 0), 0) / userPosts.length)
      : 0,
    popularTopics: userPosts
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map(p => p.title),
    readCategories: [...new Set(userBookmarks.map(b => b.post?.category?.name).filter(Boolean))],
    readTags: [...new Set(userBookmarks.map(b => b.post?.tags?.map(t => t.name)).flat().filter(Boolean))],
    followedAuthors: user.following || [],
    postsCount: userPosts.length,
    totalViews: userPosts.reduce((sum, p) => sum + (p.views || 0), 0),
    followersCount: user.followers?.length || 0,
    role: user.role,
    trendingTopics: [],
  };
  
  const dashboard = await aiService.generatePersonalizedDashboard(userProfile);
  
  res.json({
    status: 'success',
    data: {
      dashboard,
    },
  });
});

