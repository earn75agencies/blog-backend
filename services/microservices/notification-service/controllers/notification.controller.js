const Notification = require('../../../models/Notification.model');
const { asyncHandler } = require('../../../utils/asyncHandler');
const ErrorResponse = require('../../../utils/ErrorResponse');
const { calculatePagination, getSkip } = require('../../../utils/pagination.util');

/**
 * Get user notifications
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

  res.status(200).json({
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
 * Mark notification as read
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

  res.status(200).json({
    status: 'success',
    message: 'Notification marked as read',
  });
});

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read',
  });
});

/**
 * Delete notification
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    throw new ErrorResponse('Notification not found', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'Notification deleted',
  });
});

/**
 * Get unread count
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    user: req.user._id,
    isRead: false,
  });

  res.status(200).json({
    status: 'success',
    data: {
      count,
    },
  });
});

