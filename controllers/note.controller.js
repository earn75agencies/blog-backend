const Note = require('../models/Note.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const CacheUtil = require('../utils/cache.util');

/**
 * @desc    Get user notes for a post
 * @route   GET /api/posts/:postId/notes
 * @access  Private
 */
exports.getPostNotes = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  // Verify post exists
  const post = await Post.findById(postId).lean();
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const notes = await Note.getUserNotesForPost(userId, postId);

  res.json({
    status: 'success',
    results: notes.length,
    data: {
      notes,
    },
  });
});

/**
 * @desc    Get all user notes
 * @route   GET /api/notes
 * @access  Private
 */
exports.getUserNotes = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    type,
    tags,
    postId,
    page = 1,
    limit = 20,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const notes = await Note.getUserNotes(userId, {
    type,
    tags: tags ? tags.split(',') : undefined,
    postId,
    limit: parseInt(limit),
    skip,
  });

  const total = await Note.countDocuments({
    user: userId,
    ...(type && { type }),
    ...(tags && { tags: { $in: tags.split(',') } }),
    ...(postId && { post: postId }),
  });

  res.json({
    status: 'success',
    results: notes.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
    data: {
      notes,
    },
  });
});

/**
 * @desc    Get single note
 * @route   GET /api/notes/:id
 * @access  Private
 */
exports.getNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    user: req.user._id,
  })
    .populate('post', 'title slug excerpt')
    .lean();

  if (!note) {
    throw new ErrorResponse('Note not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      note,
    },
  });
});

/**
 * @desc    Create note
 * @route   POST /api/posts/:postId/notes
 * @access  Private
 */
exports.createNote = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;
  const {
    content,
    highlightedText,
    type = 'note',
    color,
    tags = [],
    contentReference,
    position,
    isPrivate = true,
  } = req.body;

  // Verify post exists
  const post = await Post.findById(postId).lean();
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const note = await Note.create({
    user: userId,
    post: postId,
    content,
    highlightedText,
    type,
    color,
    tags: Array.isArray(tags) ? tags : tags.split(',').filter(Boolean),
    contentReference,
    position,
    isPrivate,
  });

  // Invalidate cache
  CacheUtil.del(`notes:user:${userId}:post:${postId}`);

  res.status(201).json({
    status: 'success',
    message: 'Note created successfully',
    data: {
      note,
    },
  });
});

/**
 * @desc    Update note
 * @route   PUT /api/notes/:id
 * @access  Private
 */
exports.updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!note) {
    throw new ErrorResponse('Note not found', 404);
  }

  const {
    content,
    highlightedText,
    type,
    color,
    tags,
    isPrivate,
    isPinned,
  } = req.body;

  if (content !== undefined) note.content = content;
  if (highlightedText !== undefined) note.highlightedText = highlightedText;
  if (type !== undefined) note.type = type;
  if (color !== undefined) note.color = color;
  if (tags !== undefined) {
    note.tags = Array.isArray(tags) ? tags : tags.split(',').filter(Boolean);
  }
  if (isPrivate !== undefined) note.isPrivate = isPrivate;
  if (isPinned !== undefined) note.isPinned = isPinned;

  await note.save();

  // Invalidate cache
  CacheUtil.del(`notes:user:${note.user}:post:${note.post}`);

  res.json({
    status: 'success',
    message: 'Note updated successfully',
    data: {
      note,
    },
  });
});

/**
 * @desc    Delete note
 * @route   DELETE /api/notes/:id
 * @access  Private
 */
exports.deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!note) {
    throw new ErrorResponse('Note not found', 404);
  }

  const postId = note.post;
  const userId = note.user;

  await note.deleteOne();

  // Invalidate cache
  CacheUtil.del(`notes:user:${userId}:post:${postId}`);

  res.json({
    status: 'success',
    message: 'Note deleted successfully',
  });
});

/**
 * @desc    Toggle note pin
 * @route   PATCH /api/notes/:id/pin
 * @access  Private
 */
exports.togglePin = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!note) {
    throw new ErrorResponse('Note not found', 404);
  }

  const isPinned = await note.togglePin();

  res.json({
    status: 'success',
    message: `Note ${isPinned ? 'pinned' : 'unpinned'}`,
    data: {
      note,
      isPinned,
    },
  });
});

/**
 * @desc    Search user notes
 * @route   GET /api/notes/search?q=
 * @access  Private
 */
exports.searchNotes = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const userId = req.user._id;

  if (!q || q.length < 2) {
    return res.json({
      status: 'success',
      results: 0,
      data: { notes: [] },
    });
  }

  const notes = await Note.searchUserNotes(userId, q);

  res.json({
    status: 'success',
    results: notes.length,
    data: {
      notes,
    },
  });
});

/**
 * @desc    Get note statistics
 * @route   GET /api/notes/stats
 * @access  Private
 */
exports.getNoteStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [total, byType, byPost] = await Promise.all([
    Note.countDocuments({ user: userId }),
    Note.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Note.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$post', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: '_id',
          as: 'post',
        },
      },
      { $unwind: '$post' },
      { $project: { post: { title: 1, slug: 1 }, count: 1 } },
    ]),
  ]);

  res.json({
    status: 'success',
    data: {
      total,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topPosts: byPost,
    },
  });
});



