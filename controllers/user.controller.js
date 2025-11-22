const User = require('../models/User.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const notificationService = require('../services/notification.service');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Public
 */
exports.getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  const query = { isActive: true };
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

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
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Public
 */
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('postsCount')
    .populate('followers', 'username avatar')
    .populate('following', 'username avatar');

  if (!user || !user.isActive) {
    throw new ErrorResponse('User not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      user,
    },
  });
});

/**
 * @desc    Get user profile by username
 * @route   GET /api/users/profile/:username
 * @access  Public
 */
exports.getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username })
    .select('-password')
    .populate('postsCount')
    .populate({
      path: 'followers',
      select: 'username avatar',
      limit: 10,
    })
    .populate({
      path: 'following',
      select: 'username avatar',
      limit: 10,
    });

  if (!user || !user.isActive) {
    throw new ErrorResponse('User not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      user,
    },
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private
 */
exports.updateUser = asyncHandler(async (req, res) => {
  // Check if user can update this profile
  if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this profile', 403);
  }

  const { firstName, lastName, bio, avatar } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  // Update fields
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (bio !== undefined) user.bio = bio;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();

  res.json({
    status: 'success',
    message: 'User updated successfully',
    data: {
      user: user.toSafeObject(),
    },
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  // Soft delete (deactivate)
  user.isActive = false;
  await user.save();

  res.json({
    status: 'success',
    message: 'User deleted successfully',
  });
});

/**
 * @desc    Follow user
 * @route   POST /api/users/:id/follow
 * @access  Private
 */
exports.followUser = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    throw new ErrorResponse('User not found', 404);
  }

  if (req.user._id.toString() === req.params.id) {
    throw new ErrorResponse('You cannot follow yourself', 400);
  }

  const user = await User.findById(req.user._id);

  if (user.following.includes(req.params.id)) {
    throw new ErrorResponse('You are already following this user', 400);
  }

  user.following.push(req.params.id);
  targetUser.followers.push(req.user._id);

  await Promise.all([user.save(), targetUser.save()]);

  // Create notification
  await notificationService.createFollowNotification(
    req.user._id.toString(),
    targetUser._id.toString()
  );

  res.json({
    status: 'success',
    message: 'User followed successfully',
  });
});

/**
 * @desc    Unfollow user
 * @route   POST /api/users/:id/unfollow
 * @access  Private
 */
exports.unfollowUser = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    throw new ErrorResponse('User not found', 404);
  }

  const user = await User.findById(req.user._id);

  if (!user.following.includes(req.params.id)) {
    throw new ErrorResponse('You are not following this user', 400);
  }

  user.following.pull(req.params.id);
  targetUser.followers.pull(req.user._id);

  await Promise.all([user.save(), targetUser.save()]);

  res.json({
    status: 'success',
    message: 'User unfollowed successfully',
  });
});

/**
 * @desc    Get user followers
 * @route   GET /api/users/:id/followers
 * @access  Public
 */
exports.getUserFollowers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate({
    path: 'followers',
    select: 'username avatar firstName lastName bio',
  });

  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  res.json({
    status: 'success',
    results: user.followers.length,
    data: {
      followers: user.followers,
    },
  });
});

/**
 * @desc    Get user following
 * @route   GET /api/users/:id/following
 * @access  Public
 */
exports.getUserFollowing = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate({
    path: 'following',
    select: 'username avatar firstName lastName bio',
  });

  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  res.json({
    status: 'success',
    results: user.following.length,
    data: {
      following: user.following,
    },
  });
});

/**
 * @desc    Get user posts (with cursor pagination)
 * @route   GET /api/users/:id/posts?cursor=&limit=20
 * @access  Public
 */
exports.getUserPosts = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const cursor = req.query.cursor;
  const status = req.query.status || 'published';
  const useCursor = cursor !== undefined || req.query.pagination === 'cursor';

  const query = { author: req.params.id };
  const isOwnPosts = req.user && req.user._id.toString() === req.params.id;
  
  if (isOwnPosts) {
    // Allow users to see their own posts (all statuses if no status filter)
    if (status && status !== 'all') {
      query.status = status;
    }
  } else {
    // Others can only see published posts
    query.status = 'published';
    query.publishedAt = { $lte: new Date() };
  }

  if (useCursor) {
    // Cursor-based pagination
    const posts = await Post.paginateWithCursor(query, { cursor, limit });
    
    const hasMore = posts.length > limit;
    const results = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore && results.length > 0 
      ? results[results.length - 1].cursor 
      : null;

    // Populate fields
    await Post.populate(results, [
      { path: 'author', select: 'username avatar firstName lastName' },
      { path: 'category', select: 'name slug' },
      { path: 'tags', select: 'name slug' },
    ]);

    res.json({
      status: 'success',
      results: results.length,
      data: {
        posts: results,
      },
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } else {
    // Offset pagination (backward compatible)
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const sortObj = isOwnPosts 
      ? { createdAt: -1 }
      : { publishedAt: -1, createdAt: -1 };

    const posts = await Post.find(query)
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .skip(skip)
      .limit(limit)
      .sort(sortObj)
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
  }
});

