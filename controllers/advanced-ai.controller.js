const advancedAIService = require('../services/ai/advanced-ai.service');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Generate full blog post using AI
 * @route   POST /api/ai/generate-post
 * @access  Private/Author
 */
exports.generateBlogPost = asyncHandler(async (req, res) => {
  const { topic, tone, length, targetAudience, keywords } = req.body;

  if (!topic) {
    throw new ErrorResponse('Topic is required', 400);
  }

  const generatedPost = await advancedAIService.generateBlogPost({
    topic,
    tone,
    length,
    targetAudience,
    keywords: keywords || [],
  });

  res.json({
    status: 'success',
    data: {
      post: generatedPost,
    },
  });
});

/**
 * @desc    Generate content summary
 * @route   POST /api/ai/summarize
 * @access  Private
 */
exports.summarizeContent = asyncHandler(async (req, res) => {
  const { content, maxLength } = req.body;

  if (!content) {
    throw new ErrorResponse('Content is required', 400);
  }

  const summary = await advancedAIService.generateSummary(content, maxLength || 200);

  res.json({
    status: 'success',
    data: {
      summary,
    },
  });
});

/**
 * @desc    Translate content
 * @route   POST /api/ai/translate
 * @access  Private
 */
exports.translateContent = asyncHandler(async (req, res) => {
  const { content, targetLanguage, sourceLanguage } = req.body;

  if (!content || !targetLanguage) {
    throw new ErrorResponse('Content and target language are required', 400);
  }

  const translated = await advancedAIService.translateContent(
    content,
    targetLanguage,
    sourceLanguage || 'auto'
  );

  res.json({
    status: 'success',
    data: {
      translated,
      targetLanguage,
      sourceLanguage: sourceLanguage || 'auto',
    },
  });
});

/**
 * @desc    Analyze content toxicity
 * @route   POST /api/ai/toxicity
 * @access  Private/Admin
 */
exports.analyzeToxicity = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new ErrorResponse('Content is required', 400);
  }

  const analysis = await advancedAIService.analyzeToxicity(content);

  res.json({
    status: 'success',
    data: {
      analysis,
    },
  });
});

/**
 * @desc    Predict trending topics
 * @route   GET /api/ai/trending-predictions
 * @access  Private
 */
exports.predictTrending = asyncHandler(async (req, res) => {
  const context = {
    currentTrends: req.query.currentTrends ? JSON.parse(req.query.currentTrends) : {},
    historicalData: req.query.historicalData ? JSON.parse(req.query.historicalData) : {},
    industry: req.query.industry || 'general',
  };

  const predictions = await advancedAIService.predictTrendingTopics(context);

  res.json({
    status: 'success',
    data: {
      predictions,
    },
  });
});

/**
 * @desc    AI writing assistance
 * @route   POST /api/ai/assist-writing
 * @access  Private/Author
 */
exports.assistWriting = asyncHandler(async (req, res) => {
  const { text, action } = req.body;

  if (!text) {
    throw new ErrorResponse('Text is required', 400);
  }

  const improved = await advancedAIService.assistWriting(text, action || 'improve');

  res.json({
    status: 'success',
    data: {
      original: text,
      improved,
      action: action || 'improve',
    },
  });
});

/**
 * @desc    Get hyper-personalized recommendations
 * @route   GET /api/ai/hyper-recommendations
 * @access  Private
 */
exports.getHyperRecommendations = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  // Build comprehensive user profile
  const User = require('../models/User.model');
  const Post = require('../models/Post.model');
  const Bookmark = require('../models/Bookmark.model');

  const user = await User.findById(req.user._id);
  const userPosts = await Post.find({ author: req.user._id })
    .select('category tags views likesCount')
    .limit(50);
  const userBookmarks = await Bookmark.find({ user: req.user._id })
    .populate('post', 'category tags author')
    .limit(50);

  const userProfile = {
    readingHistory: userBookmarks.map(b => ({
      category: b.post?.category?.name,
      tags: b.post?.tags?.map(t => t.name),
      author: b.post?.author?._id?.toString(),
    })),
    preferences: {
      categories: [...new Set(userPosts.map(p => p.category?.name).filter(Boolean))],
      tags: [...new Set(userPosts.map(p => p.tags?.map(t => t.name)).flat().filter(Boolean))],
    },
    behavior: {
      avgReadingTime: 5,
      readingFrequency: 'daily',
    },
    demographics: {
      role: user.role,
    },
    engagement: {
      postsCreated: userPosts.length,
      avgViews: userPosts.length > 0
        ? userPosts.reduce((sum, p) => sum + (p.views || 0), 0) / userPosts.length
        : 0,
    },
  };

  // Get available content
  const availableContent = await Post.find({
    status: 'published',
    isPublished: true,
    author: { $ne: req.user._id },
  })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .select('title excerpt featuredImage views likesCount category tags author publishedAt')
    .limit(100)
    .sort({ publishedAt: -1 });

  const recommendations = await advancedAIService.getHyperPersonalizedRecommendations(
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

