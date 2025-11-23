/**
 * AI Controller - Enhanced with Real AI Services
 * Handles all AI-powered features
 */

const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const Post = require('../models/Post.model');
const User = require('../models/User.model');
const openaiService = require('../services/ai/openai.service');
const pineconeService = require('../services/ai/pinecone.service');
const elevenlabsService = require('../services/ai/elevenlabs.service');

/**
 * @desc    Semantic search posts
 * @route   GET /api/ai/search?q=query&limit=10
 * @access  Public
 */
exports.semanticSearch = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q) {
    throw new ErrorResponse('Search query is required', 400);
  }

  if (!pineconeService.isAvailable()) {
    throw new ErrorResponse('Semantic search is not available', 503);
  }

  // Search Pinecone
  const results = await pineconeService.semanticSearch(q, {
    limit: parseInt(limit),
    filter: { status: 'published' },
  });

  // Fetch full post data from MongoDB
  const postIds = results.map(r => r.id);
  const posts = await Post.find({ _id: { $in: postIds }, status: 'published' })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .lean();

  // Merge with relevance scores
  const rankedPosts = posts.map(post => {
    const match = results.find(r => r.id === post._id.toString());
    return {
      ...post,
      relevanceScore: match ? match.score : 0,
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);

  res.json({
    status: 'success',
    results: rankedPosts.length,
    data: {
      posts: rankedPosts,
      query: q,
    },
  });
});

/**
 * @desc    Get AI recommendations for a post
 * @route   GET /api/ai/recommendations/:postId?limit=5
 * @access  Public
 */
exports.getPostRecommendations = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { limit = 5 } = req.query;

  if (!pineconeService.isAvailable()) {
    throw new ErrorResponse('Recommendations are not available', 503);
  }

  // Get recommendations from Pinecone
  const recommendations = await pineconeService.getRecommendations(postId, {
    limit: parseInt(limit),
  });

  // Fetch full post data
  const postIds = recommendations.map(r => r.id);
  const posts = await Post.find({ _id: { $in: postIds }, status: 'published' })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .lean();

  res.json({
    status: 'success',
    results: posts.length,
    data: {
      posts,
    },
  });
});

/**
 * @desc    Get content suggestions for author
 * @route   POST /api/ai/suggestions
 * @access  Private/Author
 */
exports.getContentSuggestions = asyncHandler(async (req, res) => {
  const { category, keywords = [] } = req.body;

  if (!openaiService.isAvailable()) {
    throw new ErrorResponse('Content suggestions are not available', 503);
  }

  // Get user's writing history
  const userPosts = await Post.find({ 
    author: req.user._id,
    status: 'published',
  })
    .populate('category', 'name')
    .populate('tags', 'name')
    .select('title views likesCount')
    .sort('-publishedAt')
    .limit(20)
    .lean();

  // Get trending tags
  const trendingPosts = await Post.find({ status: 'published' })
    .populate('tags', 'name')
    .sort('-views')
    .limit(20)
    .lean();

  const trendingTags = [...new Set(
    trendingPosts
      .flatMap(p => p.tags.map(t => t.name))
      .filter(Boolean)
  )];

  // Generate suggestions
  const suggestions = await openaiService.generateSuggestions({
    recentPosts: userPosts.map(p => p.title),
    trendingTags,
    category: category || userPosts[0]?.category?.name || 'General',
    userInterests: keywords,
  });

  res.json({
    status: 'success',
    data: {
      suggestions,
    },
  });
});

/**
 * @desc    Optimize post for SEO
 * @route   POST /api/ai/seo/optimize
 * @access  Private/Author
 */
exports.optimizeSEO = asyncHandler(async (req, res) => {
  const { title, content, keywords = [] } = req.body;

  if (!title || !content) {
    throw new ErrorResponse('Title and content are required', 400);
  }

  if (!openaiService.isAvailable()) {
    throw new ErrorResponse('SEO optimization is not available', 503);
  }

  const optimization = await openaiService.optimizeSEO(title, content, keywords);

  res.json({
    status: 'success',
    data: {
      optimization,
    },
  });
});

/**
 * @desc    Analyze content sentiment
 * @route   POST /api/ai/sentiment
 * @access  Private
 */
exports.analyzeSentiment = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    throw new ErrorResponse('Text is required', 400);
  }

  if (!openaiService.isAvailable()) {
    throw new ErrorResponse('Sentiment analysis is not available', 503);
  }

  const sentiment = await openaiService.analyzeSentiment(text);

  res.json({
    status: 'success',
    data: {
      sentiment,
    },
  });
});

/**
 * @desc    Moderate content
 * @route   POST /api/ai/moderate
 * @access  Private/Admin
 */
exports.moderateContent = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    throw new ErrorResponse('Text is required', 400);
  }

  if (!openaiService.isAvailable()) {
    throw new ErrorResponse('Content moderation is not available', 503);
  }

  const moderation = await openaiService.moderateContent(text);

  res.json({
    status: 'success',
    data: {
      moderation,
      recommendation: moderation.safe ? 'approve' : 'review',
    },
  });
});

/**
 * @desc    Predict post virality
 * @route   POST /api/ai/virality/:postId
 * @access  Private/Author
 */
exports.predictVirality = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId)
    .populate('category', 'name')
    .populate('tags', 'name');

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check authorization
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  if (!openaiService.isAvailable()) {
    throw new ErrorResponse('Virality prediction is not available', 503);
  }

  const prediction = await openaiService.predictVirality(post);

  // Optionally save prediction to post
  post.viralityScore = prediction.viralityScore;
  await post.save();

  res.json({
    status: 'success',
    data: {
      prediction,
    },
  });
});

/**
 * @desc    Generate podcast from post
 * @route   POST /api/ai/podcast/:postId
 * @access  Private/Author
 */
exports.generatePodcast = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check authorization
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  if (!elevenlabsService.isAvailable()) {
    throw new ErrorResponse('Podcast generation is not available', 503);
  }

  // Generate podcast
  const podcast = await elevenlabsService.generatePostPodcast(post, req.body.voiceSettings);

  // Save podcast URL to post
  post.podcastUrl = podcast.url;
  await post.save();

  res.json({
    status: 'success',
    message: 'Podcast generated successfully',
    data: {
      podcast,
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

  if (!openaiService.isAvailable()) {
    throw new ErrorResponse('Auto-tagging is not available', 503);
  }

  const result = await openaiService.autoTag(title, content, excerpt || content.substring(0, 200));

  res.json({
    status: 'success',
    data: {
      tags: result.tags,
      categories: result.categories,
      confidence: result.confidence,
    },
  });
});

/**
 * @desc    Get personalized user recommendations
 * @route   GET /api/ai/recommendations?limit=10
 * @access  Private
 */
exports.getRecommendations = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  // Get user's reading history
  const userBookmarks = await require('../models/Bookmark.model')
    .find({ user: req.user._id })
    .populate({
      path: 'post',
      populate: [
        { path: 'category', select: 'name' },
        { path: 'tags', select: 'name' }
      ]
    })
    .limit(50)
    .lean();

  const readCategories = [...new Set(
    userBookmarks
      .map(b => b.post?.category?.name)
      .filter(Boolean)
  )];

  const readTags = [...new Set(
    userBookmarks
      .flatMap(b => b.post?.tags?.map(t => t.name) || [])
      .filter(Boolean)
  )];

  // Get available posts
  const availablePosts = await Post.find({
    status: 'published',
    author: { $ne: req.user._id },
  })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .sort('-publishedAt')
    .limit(100)
    .lean();

  if (!openaiService.isAvailable() || availablePosts.length === 0) {
    // Fallback: Simple recommendation based on categories/tags
    const recommendations = availablePosts
      .filter(post => 
        readCategories.includes(post.category?.name) ||
        post.tags?.some(tag => readTags.includes(tag.name))
      )
      .slice(0, parseInt(limit));

    return res.json({
      status: 'success',
      results: recommendations.length,
      data: {
        recommendations,
        method: 'rule-based',
      },
    });
  }

  // AI-powered recommendations
  const aiResult = await openaiService.generatePersonalizedRecommendations(
    { readCategories, readTags },
    availablePosts
  );

  const recommendations = aiResult.recommendedPostIds
    .map(idx => availablePosts[idx])
    .filter(Boolean)
    .slice(0, parseInt(limit));

  res.json({
    status: 'success',
    results: recommendations.length,
    data: {
      recommendations,
      reasoning: aiResult.reasoning,
      method: 'ai-powered',
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
    .select('category tags title views likesCount excerpt')
    .limit(50)
    .lean();

  const userBookmarks = await require('../models/Bookmark.model')
    .find({ user: req.user._id })
    .populate({
      path: 'post',
      populate: [
        { path: 'category', select: 'name' },
        { path: 'tags', select: 'name' }
      ]
    })
    .limit(50)
    .lean();

  const dashboard = {
    user: {
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      postsCount: userPosts.length,
      totalViews: userPosts.reduce((sum, p) => sum + (p.views || 0), 0),
      totalLikes: userPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0),
      avgPostLength: userPosts.length > 0
        ? Math.round(userPosts.reduce((sum, p) => sum + (p.excerpt?.length || 0), 0) / userPosts.length)
        : 0,
    },
    topCategories: [...new Set(userPosts.map(p => p.category))].slice(0, 5),
    topPosts: userPosts.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
    recentActivity: {
      postsThisWeek: userPosts.filter(p => 
        new Date(p.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      bookmarksCount: userBookmarks.length,
    },
  };

  res.json({
    status: 'success',
    data: {
      dashboard,
    },
  });
});

/**
 * @desc    Reindex all posts to Pinecone
 * @route   POST /api/ai/reindex
 * @access  Private/Admin
 */
exports.reindexPosts = asyncHandler(async (req, res) => {
  if (!pineconeService.isAvailable()) {
    throw new ErrorResponse('Pinecone service not available', 503);
  }

  // Get all published posts
  const posts = await Post.find({ status: 'published' })
    .populate('category', 'name')
    .populate('tags', 'name')
    .populate('author', 'username')
    .lean();

  // Bulk upsert to Pinecone
  const result = await pineconeService.bulkUpsertPosts(posts);

  res.json({
    status: 'success',
    message: 'Reindexing complete',
    data: result,
  });
});

/**
 * @desc    Get AI service status
 * @route   GET /api/ai/status
 * @access  Private/Admin
 */
exports.getServiceStatus = asyncHandler(async (req, res) => {
  const status = {
    openai: {
      available: openaiService.isAvailable(),
      features: ['embeddings', 'content generation', 'seo', 'sentiment', 'moderation'],
    },
    pinecone: {
      available: pineconeService.isAvailable(),
      features: ['semantic search', 'recommendations'],
    },
    elevenlabs: {
      available: elevenlabsService.isAvailable(),
      features: ['text-to-speech', 'podcast generation'],
    },
  };

  // Get Pinecone stats if available
  if (pineconeService.isAvailable()) {
    try {
      status.pinecone.stats = await pineconeService.getStats();
    } catch (error) {
      status.pinecone.error = error.message;
    }
  }

  // Get ElevenLabs usage if available
  if (elevenlabsService.isAvailable()) {
    try {
      status.elevenlabs.usage = await elevenlabsService.getUsage();
    } catch (error) {
      status.elevenlabs.error = error.message;
    }
  }

  res.json({
    status: 'success',
    data: status,
  });
});

module.exports = exports;