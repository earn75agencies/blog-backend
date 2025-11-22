const User = require('../models/User.model');
const Post = require('../models/Post.model');
const Comment = require('../models/Comment.model');
const Category = require('../models/Category.model');
const Tag = require('../models/Tag.model');
const Settings = require('../models/Settings.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get admin dashboard overview
 * @route   GET /api/admin/overview
 * @access  Private/Admin
 */
exports.getOverview = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalPosts,
    totalComments,
    totalCategories,
    totalTags,
    recentUsers,
    recentPosts,
    pendingComments,
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Post.countDocuments(),
    Comment.countDocuments({ isApproved: true }),
    Category.countDocuments({ isActive: true }),
    Tag.countDocuments(),
    User.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username email createdAt')
      .lean(),
    Post.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'username')
      .select('title status createdAt')
      .lean(),
    Comment.find({ isApproved: false })
      .countDocuments(),
  ]);

  res.json({
    status: 'success',
    data: {
      stats: {
        users: totalUsers,
        posts: totalPosts,
        comments: totalComments,
        categories: totalCategories,
        tags: totalTags,
        pendingComments,
      },
      recent: {
        users: recentUsers,
        posts: recentPosts,
      },
    },
  });
});

/**
 * @desc    Get all users (admin)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  const query = {};
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  const total = await User.countDocuments(query);

  res.json({
    status: 'success',
    results: users.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      users,
    },
  });
});

/**
 * @desc    Update user role
 * @route   PUT /api/admin/users/:id/role
 * @access  Private/Admin
 */
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!['user', 'author', 'admin'].includes(role)) {
    throw new ErrorResponse('Invalid role', 400);
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select('-password');

  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  res.json({
    status: 'success',
    message: 'User role updated',
    data: {
      user,
    },
  });
});

/**
 * @desc    Get all posts (admin)
 * @route   GET /api/admin/posts
 * @access  Private/Admin
 */
exports.getAllPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status;

  const query = {};
  if (status) {
    query.status = status;
  }

  const posts = await Post.find(query)
    .populate('author', 'username avatar')
    .populate('category', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  const total = await Post.countDocuments(query);

  res.json({
    status: 'success',
    results: posts.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      posts,
    },
  });
});

/**
 * @desc    Approve comment
 * @route   PUT /api/admin/comments/:id/approve
 * @access  Private/Admin
 */
exports.approveComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    { new: true }
  ).populate('author', 'username avatar');

  if (!comment) {
    throw new ErrorResponse('Comment not found', 404);
  }

  res.json({
    status: 'success',
    message: 'Comment approved',
    data: {
      comment,
    },
  });
});

/**
 * @desc    Reject comment
 * @route   PUT /api/admin/comments/:id/reject
 * @access  Private/Admin
 */
exports.rejectComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.id,
    { isApproved: false, isSpam: true },
    { new: true }
  );

  if (!comment) {
    throw new ErrorResponse('Comment not found', 404);
  }

  res.json({
    status: 'success',
    message: 'Comment rejected',
  });
});

/**
 * @desc    Get settings
 * @route   GET /api/admin/settings
 * @access  Private/Admin
 */
exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();

  res.json({
    status: 'success',
    data: {
      settings,
    },
  });
});

/**
 * @desc    Update settings
 * @route   PUT /api/admin/settings
 * @access  Private/Admin
 */
exports.updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create(req.body);
  } else {
    settings = await Settings.findByIdAndUpdate(settings._id, req.body, {
      new: true,
      runValidators: true,
    });
  }

  res.json({
    status: 'success',
    message: 'Settings updated',
    data: {
      settings,
    },
  });
});

