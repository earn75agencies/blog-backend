/**
 * Recommendation Controller
 * Handles recommendation API endpoints
 */

const { asyncHandler } = require('../utils/asyncHandler');
const recommenderService = require('../services/recommendation/recommender.service');

/**
 * @desc    Get personalized recommendations
 * @route   GET /api/recommendations
 * @access  Private
 */
exports.getRecommendations = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const categories = req.query.categories 
    ? req.query.categories.split(',')
    : [];
  const excludePosts = req.query.exclude
    ? req.query.exclude.split(',')
    : [];

  const result = await recommenderService.getRecommendations(req.user._id, {
    limit,
    categories,
    excludePosts,
  });

  res.json({
    status: 'success',
    results: result.posts.length,
    source: result.source,
    data: {
      posts: result.posts,
    },
  });
});

/**
 * @desc    Get trending posts
 * @route   GET /api/recommendations/trending
 * @access  Public
 */
exports.getTrendingPosts = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  const posts = await recommenderService.getTrendingPosts(limit);

  res.json({
    status: 'success',
    results: posts.length,
    data: {
      posts,
    },
  });
});

/**
 * @desc    Get similar posts
 * @route   GET /api/recommendations/similar/:postId
 * @access  Public
 */
exports.getSimilarPosts = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 20);

  const posts = await recommenderService.getSimilarPosts(req.params.postId, limit);

  res.json({
    status: 'success',
    results: posts.length,
    data: {
      posts,
    },
  });
});



