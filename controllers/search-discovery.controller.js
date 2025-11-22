const SearchHistory = require('../models/SearchHistory.model');
const Post = require('../models/Post.model');
const Series = require('../models/Series.model');
const Course = require('../models/Course.model');
const Media = require('../models/Media.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Search content
 * @route   GET /api/search
 * @access  Public
 */
exports.searchContent = asyncHandler(async (req, res) => {
  const {
    q,
    type,
    category,
    author,
    tags,
    dateFrom,
    dateTo,
    limit = 20,
    page = 1,
  } = req.query;

  if (!q) {
    throw new ErrorResponse('Search query is required', 400);
  }

  const query = {};
  if (type) {
    // Search specific type
    if (type === 'post') {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { excerpt: { $regex: q, $options: 'i' } },
      ];
      if (category) query.category = category;
      if (author) query.author = author;
      if (tags) query.tags = { $in: Array.isArray(tags) ? tags : tags.split(',') };
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const posts = await Post.find(query)
        .populate('author', 'username avatar')
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Post.countDocuments(query);

      // Save search history if user is logged in
      if (req.user) {
        await SearchHistory.create({
          user: req.user._id,
          query: q,
          filters: { type, category, author, tags },
          results: { count: total },
          device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
        });
      }

      return res.json({
        status: 'success',
        data: {
          results: posts,
          type: 'post',
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    }
  }

  // Multi-type search
  const [posts, series, courses, media] = await Promise.all([
    Post.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
      ],
      status: 'published',
    })
      .limit(10)
      .populate('author', 'username avatar'),
    Series.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ],
      status: 'published',
    })
      .limit(10)
      .populate('author', 'username avatar'),
    Course.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ],
      status: 'published',
    })
      .limit(10)
      .populate('instructor', 'username avatar'),
    Media.find({
      $or: [
        { filename: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
      ],
    })
      .limit(10),
  ]);

  // Save search history
  if (req.user) {
    await SearchHistory.create({
      user: req.user._id,
      query: q,
      results: {
        count: posts.length + series.length + courses.length + media.length,
      },
    });
  }

  res.json({
    status: 'success',
    data: {
      results: {
        posts,
        series,
        courses,
        media,
      },
      total: posts.length + series.length + courses.length + media.length,
    },
  });
});

/**
 * @desc    Get search suggestions
 * @route   GET /api/search/suggestions
 * @access  Public
 */
exports.getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return res.json({
      status: 'success',
      data: { suggestions: [] },
    });
  }

  // Get popular searches
  const popularSearches = await SearchHistory.aggregate([
    {
      $match: {
        query: { $regex: q, $options: 'i' },
      },
    },
    {
      $group: {
        _id: '$query',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  const suggestions = popularSearches.map(s => s._id);

  res.json({
    status: 'success',
    data: { suggestions },
  });
});

/**
 * @desc    Get trending searches
 * @route   GET /api/search/trending
 * @access  Public
 */
exports.getTrendingSearches = asyncHandler(async (req, res) => {
  const { limit = 20, timeframe = '7d' } = req.query;

  const now = new Date();
  let startDate = new Date();
  if (timeframe === '7d') startDate.setDate(now.getDate() - 7);
  else if (timeframe === '30d') startDate.setDate(now.getDate() - 30);
  else if (timeframe === '24h') startDate.setHours(now.getHours() - 24);

  const trending = await SearchHistory.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$query',
        count: { $sum: 1 },
        lastSearched: { $max: '$createdAt' },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  res.json({
    status: 'success',
    data: { trending },
  });
});

