const ScheduledPost = require('../models/ScheduledPost.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Create scheduled post
 * @route   POST /api/posts/schedule
 * @access  Private
 */
exports.createScheduledPost = asyncHandler(async (req, res) => {
  const { title, content, scheduledFor, timezone, community, metadata } = req.body;

  if (!scheduledFor) {
    throw new ErrorResponse('Scheduled date is required', 400);
  }

  const scheduledPost = await ScheduledPost.create({
    author: req.user._id,
    community,
    title,
    content,
    scheduledFor: new Date(scheduledFor),
    timezone: timezone || 'UTC',
    status: 'scheduled',
    metadata: metadata || {},
  });

  res.status(201).json({
    status: 'success',
    data: { scheduledPost },
  });
});

/**
 * @desc    Get scheduled posts
 * @route   GET /api/posts/scheduled
 * @access  Private
 */
exports.getScheduledPosts = asyncHandler(async (req, res) => {
  const { status, community } = req.query;

  const query = { author: req.user._id };
  if (status) query.status = status;
  if (community) query.community = community;

  const scheduledPosts = await ScheduledPost.find(query)
    .populate('community', 'name')
    .sort({ scheduledFor: 1 });

  res.json({
    status: 'success',
    data: { scheduledPosts },
  });
});

/**
 * @desc    Update scheduled post
 * @route   PATCH /api/posts/scheduled/:id
 * @access  Private
 */
exports.updateScheduledPost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, scheduledFor, timezone, status } = req.body;

  const scheduledPost = await ScheduledPost.findOne({
    _id: id,
    author: req.user._id,
  });

  if (!scheduledPost) {
    throw new ErrorResponse('Scheduled post not found', 404);
  }

  if (scheduledPost.status === 'published') {
    throw new ErrorResponse('Cannot update published post', 400);
  }

  if (title) scheduledPost.title = title;
  if (content) scheduledPost.content = content;
  if (scheduledFor) scheduledPost.scheduledFor = new Date(scheduledFor);
  if (timezone) scheduledPost.timezone = timezone;
  if (status) scheduledPost.status = status;

  await scheduledPost.save();

  res.json({
    status: 'success',
    data: { scheduledPost },
  });
});

/**
 * @desc    Cancel scheduled post
 * @route   DELETE /api/posts/scheduled/:id
 * @access  Private
 */
exports.cancelScheduledPost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const scheduledPost = await ScheduledPost.findOne({
    _id: id,
    author: req.user._id,
  });

  if (!scheduledPost) {
    throw new ErrorResponse('Scheduled post not found', 404);
  }

  if (scheduledPost.status === 'published') {
    throw new ErrorResponse('Cannot cancel published post', 400);
  }

  scheduledPost.status = 'cancelled';
  await scheduledPost.save();

  res.json({
    status: 'success',
    message: 'Scheduled post cancelled',
  });
});

