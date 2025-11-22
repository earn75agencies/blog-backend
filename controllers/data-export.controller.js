const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const User = require('../models/User.model');
const Post = require('../models/Post.model');
const Comment = require('../models/Comment.model');
const Bookmark = require('../models/Bookmark.model');

/**
 * @desc    Export user data
 * @route   GET /api/users/me/export
 * @access  Private
 */
exports.exportUserData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get all user data
  const [user, posts, comments, bookmarks] = await Promise.all([
    User.findById(userId).select('-password -emailVerificationToken -passwordResetToken').lean(),
    Post.find({ author: userId }).populate('category tags').lean(),
    Comment.find({ author: userId }).populate('post').lean(),
    Bookmark.find({ user: userId }).populate('post').lean(),
  ]);

  const exportData = {
    user: {
      profile: user,
      statistics: {
        postsCount: posts.length,
        commentsCount: comments.length,
        bookmarksCount: bookmarks.length,
      },
    },
    posts,
    comments,
    bookmarks,
    exportedAt: new Date().toISOString(),
    format: 'json',
    version: '1.0',
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="gidix-export-${Date.now()}.json"`);
  res.json(exportData);
});

/**
 * @desc    Export user posts
 * @route   GET /api/users/me/export/posts
 * @access  Private
 */
exports.exportPosts = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const format = req.query.format || 'json';

  const posts = await Post.find({ author: userId })
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .sort({ createdAt: -1 })
    .lean();

  if (format === 'csv') {
    // Convert to CSV
    const csvHeaders = ['Title', 'Slug', 'Status', 'Category', 'Tags', 'Created At', 'Published At'];
    const csvRows = posts.map((post) => [
      post.title,
      post.slug,
      post.status,
      post.category?.name || '',
      post.tags?.map((t) => t.name).join('; ') || '',
      post.createdAt,
      post.publishedAt || '',
    ]);

    const csv = [
      csvHeaders.join(','),
      ...csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="gidix-posts-${Date.now()}.csv"`);
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="gidix-posts-${Date.now()}.json"`);
    res.json({
      posts,
      exportedAt: new Date().toISOString(),
      count: posts.length,
    });
  }
});

/**
 * @desc    Export user comments
 * @route   GET /api/users/me/export/comments
 * @access  Private
 */
exports.exportComments = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const comments = await Comment.find({ author: userId })
    .populate('post', 'title slug')
    .sort({ createdAt: -1 })
    .lean();

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="gidix-comments-${Date.now()}.json"`);
  res.json({
    comments,
    exportedAt: new Date().toISOString(),
    count: comments.length,
  });
});

