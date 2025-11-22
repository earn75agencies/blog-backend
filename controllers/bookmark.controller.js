const Bookmark = require('../models/Bookmark.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get user bookmarks
 * @route   GET /api/bookmarks
 * @access  Private
 */
exports.getBookmarks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const folder = req.query.folder;

  const query = { user: req.user._id };
  if (folder) {
    query.folder = folder;
  }

  const bookmarks = await Bookmark.find(query)
    .populate({
      path: 'post',
      populate: [
        { path: 'author', select: 'username avatar firstName lastName' },
        { path: 'category', select: 'name slug' },
        { path: 'tags', select: 'name slug' },
      ],
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Bookmark.countDocuments(query);

  res.json({
    status: 'success',
    results: bookmarks.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      bookmarks: bookmarks.map(b => ({
        _id: b._id,
        post: b.post,
        folder: b.folder,
        notes: b.notes,
        createdAt: b.createdAt,
      })),
    },
  });
});

/**
 * @desc    Check if post is bookmarked
 * @route   GET /api/bookmarks/check/:postId
 * @access  Private
 */
exports.checkBookmark = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const bookmark = await Bookmark.findOne({
    user: req.user._id,
    post: postId,
  });

  res.json({
    status: 'success',
    data: {
      isBookmarked: !!bookmark,
      bookmark: bookmark || null,
    },
  });
});

/**
 * @desc    Add bookmark
 * @route   POST /api/bookmarks/:postId
 * @access  Private
 */
exports.addBookmark = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { folder = 'default', notes = '' } = req.body;

  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check if already bookmarked
  const existingBookmark = await Bookmark.findOne({
    user: req.user._id,
    post: postId,
  });

  if (existingBookmark) {
    throw new ErrorResponse('Post already bookmarked', 400);
  }

  // Create bookmark
  const bookmark = await Bookmark.create({
    user: req.user._id,
    post: postId,
    folder,
    notes,
  });

  await bookmark.populate({
    path: 'post',
    populate: [
      { path: 'author', select: 'username avatar' },
      { path: 'category', select: 'name slug' },
    ],
  });

  res.status(201).json({
    status: 'success',
    message: 'Post bookmarked successfully',
    data: {
      bookmark,
    },
  });
});

/**
 * @desc    Remove bookmark
 * @route   DELETE /api/bookmarks/:postId
 * @access  Private
 */
exports.removeBookmark = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const bookmark = await Bookmark.findOneAndDelete({
    user: req.user._id,
    post: postId,
  });

  if (!bookmark) {
    throw new ErrorResponse('Bookmark not found', 404);
  }

  res.json({
    status: 'success',
    message: 'Bookmark removed successfully',
  });
});

/**
 * @desc    Update bookmark
 * @route   PUT /api/bookmarks/:postId
 * @access  Private
 */
exports.updateBookmark = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { folder, notes } = req.body;

  const bookmark = await Bookmark.findOne({
    user: req.user._id,
    post: postId,
  });

  if (!bookmark) {
    throw new ErrorResponse('Bookmark not found', 404);
  }

  // Update fields
  if (folder !== undefined) bookmark.folder = folder;
  if (notes !== undefined) bookmark.notes = notes;

  await bookmark.save();

  await bookmark.populate({
    path: 'post',
    populate: [
      { path: 'author', select: 'username avatar' },
      { path: 'category', select: 'name slug' },
    ],
  });

  res.json({
    status: 'success',
    message: 'Bookmark updated successfully',
    data: {
      bookmark,
    },
  });
});

/**
 * @desc    Get bookmark folders
 * @route   GET /api/bookmarks/folders
 * @access  Private
 */
exports.getBookmarkFolders = asyncHandler(async (req, res) => {
  const folders = await Bookmark.distinct('folder', { user: req.user._id });

  // Get count for each folder
  const folderStats = await Promise.all(
    folders.map(async (folder) => {
      const count = await Bookmark.countDocuments({
        user: req.user._id,
        folder,
      });
      return { folder, count };
    })
  );

  res.json({
    status: 'success',
    data: {
      folders: folderStats,
    },
  });
});