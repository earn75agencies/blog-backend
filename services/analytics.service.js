const Post = require('../models/Post.model');
const User = require('../models/User.model');
const Comment = require('../models/Comment.model');
const Category = require('../models/Category.model');
const Tag = require('../models/Tag.model');
const View = require('../models/View.model');

/**
 * Analytics service
 * Provides analytics and reporting functionality
 */
class AnalyticsService {
  /**
   * Get overall statistics
   * @returns {Promise<Object>} Statistics
   */
  async getOverallStats() {
    const [
      totalUsers,
      totalPosts,
      totalComments,
      totalCategories,
      totalTags,
      publishedPosts,
      draftPosts,
      totalViews,
      uniqueViews,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Post.countDocuments(),
      Comment.countDocuments({ isApproved: true }),
      Category.countDocuments({ isActive: true }),
      Tag.countDocuments(),
      Post.countDocuments({ status: 'published' }),
      Post.countDocuments({ status: 'draft' }),
      Post.aggregate([
        { $group: { _id: null, total: { $sum: '$views' } } },
      ]),
      View.countDocuments(),
    ]);

    return {
      users: {
        total: totalUsers,
        active: totalUsers,
      },
      posts: {
        total: totalPosts,
        published: publishedPosts,
        draft: draftPosts,
        archived: totalPosts - publishedPosts - draftPosts,
      },
      comments: {
        total: totalComments,
      },
      categories: {
        total: totalCategories,
      },
      tags: {
        total: totalTags,
      },
      views: {
        total: totalViews[0]?.total || 0,
        unique: uniqueViews,
      },
    };
  }

  /**
   * Get posts statistics
   * @param {Object} filters - Date filters
   * @returns {Promise<Object>} Posts statistics
   */
  async getPostsStats(filters = {}) {
    const { startDate, endDate } = filters;
    const dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      totalViews,
      totalLikes,
      totalComments,
      postsByCategory,
      postsByAuthor,
      popularPosts,
      trendingPosts,
    ] = await Promise.all([
      Post.countDocuments(dateFilter),
      Post.countDocuments({ ...dateFilter, status: 'published' }),
      Post.countDocuments({ ...dateFilter, status: 'draft' }),
      Post.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, total: { $sum: '$views' } } },
      ]),
      Post.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, total: { $sum: { $size: '$likes' } } } },
      ]),
      Post.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, total: { $sum: '$commentsCount' } } },
      ]),
      Post.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Post.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$author', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Post.find({ ...dateFilter, status: 'published' })
        .sort({ views: -1 })
        .limit(10)
        .select('title views likes commentsCount')
        .lean(),
      Post.find({ ...dateFilter, status: 'published' })
        .sort({ publishedAt: -1 })
        .limit(10)
        .select('title views likes commentsCount publishedAt')
        .lean(),
    ]);

    return {
      total: totalPosts,
      published: publishedPosts,
      draft: draftPosts,
      views: totalViews[0]?.total || 0,
      likes: totalLikes[0]?.total || 0,
      comments: totalComments[0]?.total || 0,
      byCategory: postsByCategory,
      byAuthor: postsByAuthor,
      popular: popularPosts,
      trending: trendingPosts,
    };
  }

  /**
   * Get user statistics
   * @param {Object} filters - Date filters
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(filters = {}) {
    const { startDate, endDate } = filters;
    const dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      totalUsers,
      activeUsers,
      newUsers,
      usersByRole,
      topContributors,
      mostActiveUsers,
    ] = await Promise.all([
      User.countDocuments(dateFilter),
      User.countDocuments({ ...dateFilter, isActive: true }),
      User.countDocuments({
        ...dateFilter,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
      User.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      Post.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$author',
            postsCount: { $sum: 1 },
            viewsCount: { $sum: '$views' },
            likesCount: { $sum: { $size: '$likes' } },
          },
        },
        { $sort: { postsCount: -1 } },
        { $limit: 10 },
      ]),
      Comment.aggregate([
        { $match: { ...dateFilter, isApproved: true } },
        {
          $group: {
            _id: '$author',
            commentsCount: { $sum: 1 },
          },
        },
        { $sort: { commentsCount: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      total: totalUsers,
      active: activeUsers,
      new: newUsers,
      byRole: usersByRole,
      topContributors,
      mostActiveUsers,
    };
  }

  /**
   * Get trends data
   * @param {number} days - Number of days
   * @returns {Promise<Object>} Trends data
   */
  async getTrends(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const [postsByDay, usersByDay, viewsByDay] = await Promise.all([
      Post.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      View.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
    ]);

    return {
      posts: postsByDay,
      users: usersByDay,
      views: viewsByDay,
    };
  }

  /**
   * Get geographic statistics
   * @returns {Promise<Object>} Geographic stats
   */
  async getGeographicStats() {
    const stats = await View.aggregate([
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    return stats;
  }

  /**
   * Get device statistics
   * @returns {Promise<Object>} Device stats
   */
  async getDeviceStats() {
    const stats = await View.aggregate([
      {
        $group: {
          _id: '$device',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return stats;
  }
}

module.exports = new AnalyticsService();

