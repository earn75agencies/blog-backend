const asyncHandler = require('../../../utils/asyncHandler');
const analyticsService = require('../../../services/analytics.service');

/**
 * Get analytics overview
 */
exports.getOverview = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getOverallStats();
  
  res.status(200).json({
    status: 'success',
    data: {
      totalUsers: stats.users.total,
      totalPosts: stats.posts.total,
      totalViews: stats.views.total,
      totalComments: stats.comments.total,
      publishedPosts: stats.posts.published,
      draftPosts: stats.posts.draft,
      activeUsers: stats.users.active,
      uniqueViews: stats.views.unique,
    },
  });
});

/**
 * Get posts statistics
 */
exports.getPostsStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const stats = await analyticsService.getPostsStats({ startDate, endDate });
  
  res.status(200).json({
    status: 'success',
    data: {
      published: stats.published,
      draft: stats.draft,
      total: stats.total,
      byCategory: stats.byCategory,
      byAuthor: stats.byAuthor,
      popular: stats.popular,
      trending: stats.trending,
      views: stats.views,
      likes: stats.likes,
      comments: stats.comments,
    },
  });
});

/**
 * Get users statistics
 */
exports.getUserStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const stats = await analyticsService.getUserStats({ startDate, endDate });
  
  res.status(200).json({
    status: 'success',
    data: {
      total: stats.total,
      active: stats.active,
      new: stats.new,
      byRole: stats.byRole,
      growth: stats.growth,
      engagement: stats.engagement,
    },
  });
});

/**
 * Get trends
 */
exports.getTrends = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const trends = await analyticsService.getTrends(days);
  
  res.status(200).json({
    status: 'success',
    data: {
      posts: trends.posts,
      users: trends.users,
      categories: trends.categories,
      tags: trends.tags,
    },
  });
});

/**
 * Get geographic statistics
 */
exports.getGeographicStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getGeographicStats();
  
  res.status(200).json({
    status: 'success',
    data: {
      countries: stats.countries,
      cities: stats.cities,
      regions: stats.regions,
    },
  });
});

