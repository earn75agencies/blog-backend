const Hashtag = require('../models/Hashtag.model');
const Mention = require('../models/Mention.model');
const Post = require('../models/Post.model');
const Comment = require('../models/Comment.model');
const Notification = require('../models/Notification.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get trending hashtags
 * @route   GET /api/hashtags/trending
 * @access  Public
 */
exports.getTrendingHashtags = asyncHandler(async (req, res) => {
  const { region, category, limit = 50 } = req.query;

  const query = { isTrending: true };
  if (category) query.category = category;

  let hashtags = await Hashtag.find(query)
    .sort({ trendingScore: -1 })
    .limit(parseInt(limit));

  // Filter by region if specified
  if (region) {
    hashtags = hashtags.filter(h => 
      h.analytics.regionalTrends.some(rt => rt.region === region)
    );
  }

  res.json({
    status: 'success',
    data: { hashtags },
  });
});

/**
 * @desc    Get hashtag analytics
 * @route   GET /api/hashtags/:name/analytics
 * @access  Public
 */
exports.getHashtagAnalytics = asyncHandler(async (req, res) => {
  const { name } = req.params;

  const hashtag = await Hashtag.findOne({ name: name.toLowerCase() });
  if (!hashtag) {
    throw new ErrorResponse('Hashtag not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      hashtag: {
        ...hashtag.toObject(),
        analytics: hashtag.analytics,
      },
    },
  });
});

/**
 * @desc    Follow hashtag
 * @route   POST /api/hashtags/:name/follow
 * @access  Private
 */
exports.followHashtag = asyncHandler(async (req, res) => {
  const { name } = req.params;

  const hashtag = await Hashtag.findOne({ name: name.toLowerCase() });
  if (!hashtag) {
    throw new ErrorResponse('Hashtag not found', 404);
  }

  await hashtag.follow(req.user._id);

  res.json({
    status: 'success',
    message: 'Hashtag followed successfully',
    data: { hashtag },
  });
});

/**
 * @desc    Subscribe to hashtag
 * @route   POST /api/hashtags/:name/subscribe
 * @access  Private
 */
exports.subscribeHashtag = asyncHandler(async (req, res) => {
  const { name } = req.params;

  const hashtag = await Hashtag.findOne({ name: name.toLowerCase() });
  if (!hashtag) {
    throw new ErrorResponse('Hashtag not found', 404);
  }

  if (!hashtag.subscribers.includes(req.user._id)) {
    hashtag.subscribers.push(req.user._id);
    hashtag.subscribersCount += 1;
    await hashtag.save();
  }

  res.json({
    status: 'success',
    message: 'Subscribed to hashtag successfully',
    data: { hashtag },
  });
});

/**
 * @desc    Get AI-suggested hashtags
 * @route   POST /api/hashtags/suggest
 * @access  Private
 */
exports.suggestHashtags = asyncHandler(async (req, res) => {
  const { content, title } = req.body;

  // In production, use AI service to suggest hashtags
  // For now, return sample suggestions
  const suggestions = [
    { name: 'tech', score: 0.95 },
    { name: 'innovation', score: 0.87 },
    { name: 'ai', score: 0.82 },
  ];

  res.json({
    status: 'success',
    data: { suggestions },
  });
});

/**
 * @desc    Get user mentions
 * @route   GET /api/mentions
 * @access  Private
 */
exports.getMentions = asyncHandler(async (req, res) => {
  const { unread, type } = req.query;

  const query = { mentionedUser: req.user._id };
  if (unread === 'true') query.isRead = false;
  if (type) {
    if (type === 'post') query.post = { $exists: true };
    if (type === 'comment') query.comment = { $exists: true };
    if (type === 'message') query.message = { $exists: true };
  }

  const mentions = await Mention.find(query)
    .populate('mentionedBy', 'username avatar')
    .populate('post', 'title slug')
    .populate('comment', 'content')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({
    status: 'success',
    data: { mentions },
  });
});

/**
 * @desc    Mark mention as read
 * @route   PATCH /api/mentions/:id/read
 * @access  Private
 */
exports.markMentionRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const mention = await Mention.findOne({
    _id: id,
    mentionedUser: req.user._id,
  });

  if (!mention) {
    throw new ErrorResponse('Mention not found', 404);
  }

  mention.isRead = true;
  mention.readAt = new Date();
  await mention.save();

  res.json({
    status: 'success',
    data: { mention },
  });
});

