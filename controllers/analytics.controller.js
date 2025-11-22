const analyticsService = require('../services/analytics.service');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * @desc    Get overall statistics
 * @route   GET /api/analytics/overview
 * @access  Private/Admin
 */
exports.getOverview = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getOverallStats();

  res.json({
    status: 'success',
    data: {
      stats,
    },
  });
});

/**
 * @desc    Get posts statistics
 * @route   GET /api/analytics/posts
 * @access  Private/Admin
 */
exports.getPostsStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const stats = await analyticsService.getPostsStats({ startDate, endDate });

  res.json({
    status: 'success',
    data: {
      stats,
    },
  });
});

/**
 * @desc    Get user statistics
 * @route   GET /api/analytics/users
 * @access  Private/Admin
 */
exports.getUserStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const stats = await analyticsService.getUserStats({ startDate, endDate });

  res.json({
    status: 'success',
    data: {
      stats,
    },
  });
});

/**
 * @desc    Get trends data
 * @route   GET /api/analytics/trends
 * @access  Private/Admin
 */
exports.getTrends = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const trends = await analyticsService.getTrends(days);

  res.json({
    status: 'success',
    data: {
      trends,
    },
  });
});

/**
 * @desc    Get geographic statistics
 * @route   GET /api/analytics/geographic
 * @access  Private/Admin
 */
exports.getGeographicStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getGeographicStats();

  res.json({
    status: 'success',
    data: {
      stats,
    },
  });
});

/**
 * @desc    Get device statistics
 * @route   GET /api/analytics/devices
 * @access  Private/Admin
 */
exports.getDeviceStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getDeviceStats();

  res.json({
    status: 'success',
    data: {
      stats,
    },
  });
});

