const Notification = require('../models/Notification.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const { calculatePagination, getSkip } = require('../utils/pagination.util');
const CacheUtil = require('../utils/cache.util');

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = getSkip(page, limit);
  const unreadOnly = req.query.unread === 'true';

  const query = { user: req.user._id };
  if (unreadOnly) {
    query.isRead = false;
  }

  const notifications = await Notification.find(query)
    .populate('relatedUser', 'username avatar')
    .populate('relatedPost', 'title slug')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    isRead: false,
  });

  const pagination = calculatePagination(page, limit, total);

  res.json({
    status: 'success',
    results: notifications.length,
    pagination,
    data: {
      notifications,
      unreadCount,
    },
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    throw new ErrorResponse('Notification not found', 404);
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  // Invalidate unread count cache
  CacheUtil.del(`notifications:unread-count:${req.user._id}`);

  res.json({
    status: 'success',
    message: 'Notification marked as read',
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  // Invalidate unread count cache
  CacheUtil.del(`notifications:unread-count:${req.user._id}`);

  res.json({
    status: 'success',
    message: 'All notifications marked as read',
  });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    throw new ErrorResponse('Notification not found', 404);
  }

  // Invalidate unread count cache if notification was unread
  if (!notification.isRead) {
    CacheUtil.del(`notifications:unread-count:${req.user._id}`);
  }

  res.json({
    status: 'success',
    message: 'Notification deleted',
  });
});

/**
 * @desc    Get unread count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const cacheKey = `notifications:unread-count:${req.user._id}`;
  
  // Try to get from cache (30 second TTL for real-time feel)
  let count = CacheUtil.get(cacheKey);
  
  if (count === undefined) {
    count = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });
    
    // Cache for 30 seconds
    CacheUtil.set(cacheKey, count, 30);
  }

  res.json({
    status: 'success',
    data: {
      count,
    },
  });
});

