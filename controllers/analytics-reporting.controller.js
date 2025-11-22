const AnalyticsReport = require('../models/AnalyticsReport.model');
const AnalyticsEvent = require('../models/AnalyticsEvent.model');
const Post = require('../models/Post.model');
const User = require('../models/User.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Create analytics report
 * @route   POST /api/analytics/reports
 * @access  Private
 */
exports.createReport = asyncHandler(async (req, res) => {
  const {
    name,
    type,
    metrics,
    timeframe,
    filters,
    visualization,
    isScheduled,
    schedule,
  } = req.body;

  const report = await AnalyticsReport.create({
    name,
    user: req.user._id,
    type,
    metrics: metrics || [],
    timeframe,
    filters: filters || {},
    visualization: visualization || { type: 'table' },
    isScheduled: isScheduled || false,
    schedule: schedule || {},
  });

  res.status(201).json({
    status: 'success',
    data: { report },
  });
});

/**
 * @desc    Generate report
 * @route   POST /api/analytics/reports/:id/generate
 * @access  Private
 */
exports.generateReport = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const report = await AnalyticsReport.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!report) {
    throw new ErrorResponse('Report not found', 404);
  }

  // Generate report data based on type and metrics
  let data = {};

  if (report.type === 'post') {
    const query = {};
    if (report.timeframe.start) query.createdAt = { $gte: report.timeframe.start };
    if (report.timeframe.end) {
      query.createdAt = { ...query.createdAt, $lte: report.timeframe.end };
    }

    const posts = await Post.find(query);
    data = {
      totalPosts: posts.length,
      totalViews: posts.reduce((sum, p) => sum + (p.views || 0), 0),
      totalLikes: posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0),
      totalComments: posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0),
      averageEngagement: posts.reduce((sum, p) => sum + (p.engagementScore || 0), 0) / posts.length || 0,
    };
  } else if (report.type === 'user') {
    const query = {};
    if (report.timeframe.start) query.createdAt = { $gte: report.timeframe.start };
    if (report.timeframe.end) {
      query.createdAt = { ...query.createdAt, $lte: report.timeframe.end };
    }

    const users = await User.find(query);
    data = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      newUsers: users.length,
    };
  }

  report.data = data;
  report.lastGenerated = new Date();
  await report.save();

  res.json({
    status: 'success',
    data: { report },
  });
});

/**
 * @desc    Get user reports
 * @route   GET /api/analytics/reports
 * @access  Private
 */
exports.getReports = asyncHandler(async (req, res) => {
  const reports = await AnalyticsReport.find({ user: req.user._id })
    .sort({ createdAt: -1 });

  res.json({
    status: 'success',
    data: { reports },
  });
});

/**
 * @desc    Get real-time dashboard data
 * @route   GET /api/analytics/dashboard
 * @access  Private
 */
exports.getDashboard = asyncHandler(async (req, res) => {
  const { timeframe = '7d' } = req.query;

  const now = new Date();
  let startDate = new Date();
  
  if (timeframe === '7d') startDate.setDate(now.getDate() - 7);
  else if (timeframe === '30d') startDate.setDate(now.getDate() - 30);
  else if (timeframe === '90d') startDate.setDate(now.getDate() - 90);
  else if (timeframe === '1y') startDate.setFullYear(now.getFullYear() - 1);

  const [
    totalPosts,
    totalViews,
    totalUsers,
    totalEngagement,
    recentPosts,
  ] = await Promise.all([
    Post.countDocuments({ createdAt: { $gte: startDate } }),
    Post.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]),
    User.countDocuments({ createdAt: { $gte: startDate } }),
    Post.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$engagementScore' } } },
    ]),
    Post.find({ createdAt: { $gte: startDate } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('author', 'username avatar'),
  ]);

  const dashboard = {
    overview: {
      posts: totalPosts,
      views: totalViews[0]?.total || 0,
      users: totalUsers,
      engagement: totalEngagement[0]?.total || 0,
    },
    recentPosts,
    timeframe,
  };

  res.json({
    status: 'success',
    data: { dashboard },
  });
});

