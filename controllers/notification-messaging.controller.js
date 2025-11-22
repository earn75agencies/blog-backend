const Notification = require('../models/Notification.model');
const Message = require('../models/Message.model');
const Chat = require('../models/Chat.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get notifications
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const { unread, type, group, limit = 50 } = req.query;

  const query = { user: req.user._id };
  if (unread === 'true') query.isRead = false;
  if (type) query.type = type;
  if (group) query.group = group;

  const notifications = await Notification.find(query)
    .populate('relatedUser', 'username avatar')
    .populate('relatedPost', 'title slug')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  // Group notifications
  const grouped = notifications.reduce((acc, notif) => {
    const key = notif.group || notif.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(notif);
    return acc;
  }, {});

  res.json({
    status: 'success',
    data: {
      notifications,
      grouped,
      unreadCount: notifications.filter(n => !n.isRead).length,
    },
  });
});

/**
 * @desc    Mark notifications as read
 * @route   PATCH /api/notifications/read
 * @access  Private
 */
exports.markNotificationsRead = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (ids && ids.length > 0) {
    await Notification.updateMany(
      { _id: { $in: ids }, user: req.user._id },
      { isRead: true, readAt: new Date() }
    );
  } else {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  res.json({
    status: 'success',
    message: 'Notifications marked as read',
  });
});

/**
 * @desc    Send message
 * @route   POST /api/messages
 * @access  Private
 */
exports.sendMessage = asyncHandler(async (req, res) => {
  const { chatId, content, type = 'text', attachments, replyTo, mentions } = req.body;

  let chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ErrorResponse('Chat not found', 404);
  }

  // Check if user is participant
  const isParticipant = chat.participants.some(
    p => p.toString() === req.user._id.toString()
  );

  if (!isParticipant) {
    throw new ErrorResponse('Not a participant in this chat', 403);
  }

  const message = await Message.create({
    chat: chatId,
    sender: req.user._id,
    content,
    type,
    attachments: attachments || [],
    replyTo,
    mentions: mentions || [],
    deliveryStatus: 'sent',
    deliveredAt: new Date(),
  });

  // Update chat
  chat.lastMessage = message._id;
  chat.lastMessageAt = new Date();
  await chat.save();

  res.status(201).json({
    status: 'success',
    data: { message },
  });
});

/**
 * @desc    Get chat messages
 * @route   GET /api/chats/:chatId/messages
 * @access  Private
 */
exports.getChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { limit = 50, before } = req.query;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ErrorResponse('Chat not found', 404);
  }

  // Check if user is participant
  const isParticipant = chat.participants.some(
    p => p.toString() === req.user._id.toString()
  );

  if (!isParticipant) {
    throw new ErrorResponse('Not a participant in this chat', 403);
  }

  const query = { chat: chatId, isDeleted: false };
  if (before) query.createdAt = { $lt: new Date(before) }

  const messages = await Message.find(query)
    .populate('sender', 'username avatar')
    .populate('replyTo', 'content')
    .populate('mentions', 'username')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  // Mark as read
  await Message.updateMany(
    { chat: chatId, 'readBy.user': { $ne: req.user._id } },
    { $push: { readBy: { user: req.user._id, readAt: new Date() } } }
  );

  res.json({
    status: 'success',
    data: { messages: messages.reverse() },
  });
});

/**
 * @desc    React to message
 * @route   POST /api/messages/:id/react
 * @access  Private
 */
exports.reactToMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body;

  const message = await Message.findById(id);
  if (!message) {
    throw new ErrorResponse('Message not found', 404);
  }

  // Check if already reacted
  const existingReaction = message.reactions.find(
    r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
  );

  if (existingReaction) {
    // Remove reaction
    message.reactions = message.reactions.filter(
      r => !(r.user.toString() === req.user._id.toString() && r.emoji === emoji)
    );
  } else {
    // Add reaction
    message.reactions.push({
      user: req.user._id,
      emoji,
      createdAt: new Date(),
    });
  }

  await message.save();

  res.json({
    status: 'success',
    data: { message },
  });
});

