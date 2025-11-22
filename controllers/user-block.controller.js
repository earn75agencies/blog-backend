const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const User = require('../models/User.model');

/**
 * @desc    Block a user
 * @route   POST /api/users/:id/block
 * @access  Private
 */
exports.blockUser = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user._id.toString();

  if (targetUserId === currentUserId) {
    throw new ErrorResponse('You cannot block yourself', 400);
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new ErrorResponse('User not found', 404);
  }

  const currentUser = await User.findById(currentUserId);

  // Check if already blocked
  if (currentUser.blockedUsers && currentUser.blockedUsers.includes(targetUserId)) {
    throw new ErrorResponse('User is already blocked', 400);
  }

  // Add to blocked list
  if (!currentUser.blockedUsers) {
    currentUser.blockedUsers = [];
  }
  currentUser.blockedUsers.push(targetUserId);

  // Remove from following/followers if exists
  currentUser.following = currentUser.following.filter(
    (id) => id.toString() !== targetUserId
  );
  targetUser.followers = targetUser.followers.filter(
    (id) => id.toString() !== currentUserId
  );

  await Promise.all([currentUser.save(), targetUser.save()]);

  res.json({
    status: 'success',
    message: 'User blocked successfully',
  });
});

/**
 * @desc    Unblock a user
 * @route   POST /api/users/:id/unblock
 * @access  Private
 */
exports.unblockUser = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user._id.toString();

  const currentUser = await User.findById(currentUserId);

  if (!currentUser.blockedUsers || !currentUser.blockedUsers.includes(targetUserId)) {
    throw new ErrorResponse('User is not blocked', 400);
  }

  // Remove from blocked list
  currentUser.blockedUsers = currentUser.blockedUsers.filter(
    (id) => id.toString() !== targetUserId
  );

  await currentUser.save();

  res.json({
    status: 'success',
    message: 'User unblocked successfully',
  });
});

/**
 * @desc    Mute a user
 * @route   POST /api/users/:id/mute
 * @access  Private
 */
exports.muteUser = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user._id.toString();

  if (targetUserId === currentUserId) {
    throw new ErrorResponse('You cannot mute yourself', 400);
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new ErrorResponse('User not found', 404);
  }

  const currentUser = await User.findById(currentUserId);

  // Check if already muted
  if (currentUser.mutedUsers && currentUser.mutedUsers.includes(targetUserId)) {
    throw new ErrorResponse('User is already muted', 400);
  }

  // Add to muted list
  if (!currentUser.mutedUsers) {
    currentUser.mutedUsers = [];
  }
  currentUser.mutedUsers.push(targetUserId);

  await currentUser.save();

  res.json({
    status: 'success',
    message: 'User muted successfully',
  });
});

/**
 * @desc    Unmute a user
 * @route   POST /api/users/:id/unmute
 * @access  Private
 */
exports.unmuteUser = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user._id.toString();

  const currentUser = await User.findById(currentUserId);

  if (!currentUser.mutedUsers || !currentUser.mutedUsers.includes(targetUserId)) {
    throw new ErrorResponse('User is not muted', 400);
  }

  // Remove from muted list
  currentUser.mutedUsers = currentUser.mutedUsers.filter(
    (id) => id.toString() !== targetUserId
  );

  await currentUser.save();

  res.json({
    status: 'success',
    message: 'User unmuted successfully',
  });
});

/**
 * @desc    Get blocked users
 * @route   GET /api/users/me/blocked
 * @access  Private
 */
exports.getBlockedUsers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('blockedUsers', 'username avatar firstName lastName')
    .select('blockedUsers');

  res.json({
    status: 'success',
    data: {
      blockedUsers: user.blockedUsers || [],
    },
  });
});

/**
 * @desc    Get muted users
 * @route   GET /api/users/me/muted
 * @access  Private
 */
exports.getMutedUsers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('mutedUsers', 'username avatar firstName lastName')
    .select('mutedUsers');

  res.json({
    status: 'success',
    data: {
      mutedUsers: user.mutedUsers || [],
    },
  });
});

