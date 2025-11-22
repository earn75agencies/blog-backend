const Hashtag = require('../models/Hashtag.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const CacheUtil = require('../utils/cache.util');

/**
 * @desc    Get all hashtags
 * @route   GET /api/hashtags
 * @access  Public
 */
exports.getHashtags = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const query = {};
  const sortBy = req.query.sortBy || 'postsCount';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  if (req.query.trending === 'true') {
    query.isTrending = true;
  }
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: 'i' };
  }

  const hashtags = await Hashtag.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });

  const total = await Hashtag.countDocuments(query);

  res.json({
    status: 'success',
    results: hashtags.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      hashtags,
    },
  });
});

/**
 * @desc    Get single hashtag
 * @route   GET /api/hashtags/:name
 * @access  Public
 */
exports.getHashtag = asyncHandler(async (req, res) => {
  const name = req.params.name.toLowerCase().replace('#', '');
  const hashtag = await Hashtag.findOne({ name })
    .populate('posts', 'title slug excerpt featuredImage publishedAt views likesCount')
    .populate('followers', 'username avatar firstName lastName');

  if (!hashtag) {
    throw new ErrorResponse('Hashtag not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      hashtag,
    },
  });
});

/**
 * @desc    Follow hashtag
 * @route   POST /api/hashtags/:name/follow
 * @access  Private
 */
exports.followHashtag = asyncHandler(async (req, res) => {
  const name = req.params.name.toLowerCase().replace('#', '');
  let hashtag = await Hashtag.findOne({ name });

  if (!hashtag) {
    hashtag = await Hashtag.create({
      name,
      description: req.body.description,
    });
  }

  await hashtag.follow(req.user._id);

  res.json({
    status: 'success',
    message: 'Hashtag followed successfully',
    data: {
      hashtag,
    },
  });
});

/**
 * @desc    Unfollow hashtag
 * @route   POST /api/hashtags/:name/unfollow
 * @access  Private
 */
exports.unfollowHashtag = asyncHandler(async (req, res) => {
  const name = req.params.name.toLowerCase().replace('#', '');
  const hashtag = await Hashtag.findOne({ name });

  if (!hashtag) {
    throw new ErrorResponse('Hashtag not found', 404);
  }

  await hashtag.unfollow(req.user._id);

  res.json({
    status: 'success',
    message: 'Hashtag unfollowed successfully',
    data: {
      hashtag,
    },
  });
});

/**
 * @desc    Get trending hashtags
 * @route   GET /api/hashtags/trending
 * @access  Public
 */
exports.getTrendingHashtags = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const cacheKey = `hashtags:trending:${limit}`;
  let hashtags = CacheUtil.get(cacheKey);

  if (!hashtags) {
    hashtags = await Hashtag.find({ isTrending: true })
      .limit(limit)
      .sort({ trendingScore: -1 });

    CacheUtil.set(cacheKey, hashtags, 300); // Cache for 5 minutes
  }

  res.json({
    status: 'success',
    results: hashtags.length,
    data: {
      hashtags,
    },
  });
});

