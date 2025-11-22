const MobileSession = require('../models/MobileSession.model');
const OfflineCache = require('../models/OfflineCache.model');
const Post = require('../models/Post.model');
const Bookmark = require('../models/Bookmark.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Sync mobile session
 * @route   POST /api/mobile/sync
 * @access  Private
 */
exports.syncMobileSession = asyncHandler(async (req, res) => {
  const {
    deviceId,
    platform,
    appVersion,
    osVersion,
    deviceModel,
    syncedData,
    location,
  } = req.body;

  let session = await MobileSession.findOne({
    user: req.user._id,
    'device.deviceId': deviceId,
  });

  if (session) {
    session.device = {
      deviceId,
      platform,
      appVersion,
      osVersion,
      deviceModel,
    };
    session.lastSync = new Date();
    session.syncedData = syncedData || session.syncedData;
    session.location = location || session.location;
    await session.save();
  } else {
    session = await MobileSession.create({
      user: req.user._id,
      device: {
        deviceId,
        platform,
        appVersion,
        osVersion,
        deviceModel,
      },
      sessionToken: `mobile_${Date.now()}_${req.user._id}`,
      syncedData: syncedData || {},
      location,
    });
  }

  res.json({
    status: 'success',
    data: { session },
  });
});

/**
 * @desc    Get offline cache
 * @route   GET /api/mobile/offline-cache
 * @access  Private
 */
exports.getOfflineCache = asyncHandler(async (req, res) => {
  const { deviceId } = req.query;

  const query = { user: req.user._id };
  if (deviceId) query['device.deviceId'] = deviceId;

  const cache = await OfflineCache.find(query)
    .sort({ lastAccessed: -1 })
    .limit(100);

  res.json({
    status: 'success',
    data: { cache },
  });
});

/**
 * @desc    Cache content for offline
 * @route   POST /api/mobile/offline-cache
 * @access  Private
 */
exports.cacheForOffline = asyncHandler(async (req, res) => {
  const { contentType, contentId, deviceId, data, expiresIn } = req.body;

  // Get content based on type
  let contentData = {};
  if (contentType === 'post') {
    const post = await Post.findById(contentId);
    if (!post) {
      throw new ErrorResponse('Post not found', 404);
    }
    contentData = post.toObject();
  }

  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null;

  const cache = await OfflineCache.create({
    user: req.user._id,
    device: { deviceId },
    content: {
      type: contentType,
      contentId,
    },
    data: data || contentData,
    expiresAt,
    size: JSON.stringify(data || contentData).length,
  });

  res.status(201).json({
    status: 'success',
    message: 'Content cached for offline access',
    data: { cache },
  });
});

/**
 * @desc    Sync bookmarks across devices
 * @route   GET /api/mobile/sync/bookmarks
 * @access  Private
 */
exports.syncBookmarks = asyncHandler(async (req, res) => {
  const bookmarks = await Bookmark.find({ user: req.user._id })
    .populate('post', 'title slug featuredImage')
    .sort({ createdAt: -1 });

  res.json({
    status: 'success',
    data: { bookmarks },
  });
});

/**
 * @desc    Sync drafts across devices
 * @route   GET /api/mobile/sync/drafts
 * @access  Private
 */
exports.syncDrafts = asyncHandler(async (req, res) => {
  const drafts = await Post.find({
    author: req.user._id,
    status: 'draft',
  })
    .select('title excerpt createdAt updatedAt')
    .sort({ updatedAt: -1 });

  res.json({
    status: 'success',
    data: { drafts },
  });
});

