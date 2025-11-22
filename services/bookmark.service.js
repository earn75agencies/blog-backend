const Bookmark = require('../models/Bookmark.model');
const Post = require('../models/Post.model');

/**
 * Get user bookmarks
 */
exports.getUserBookmarks = async (userId, options = {}) => {
  const { page = 1, limit = 10, folder } = options;
  const query = { user: userId };
  
  if (folder) {
    query.folder = folder;
  }

  const bookmarks = await Bookmark.find(query)
    .populate('post')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  const count = await Bookmark.countDocuments(query);

  return {
    bookmarks,
    currentPage: page,
    totalPages: Math.ceil(count / limit),
    totalBookmarks: count,
  };
};

/**
 * Add bookmark
 */
exports.addBookmark = async (userId, postId, folder = 'default', notes = '') => {
  const post = await Post.findById(postId);
  if (!post) {
    throw new Error('Post not found');
  }

  const existingBookmark = await Bookmark.findOne({ user: userId, post: postId });
  if (existingBookmark) {
    throw new Error('Post already bookmarked');
  }

  const bookmark = await Bookmark.create({
    user: userId,
    post: postId,
    folder,
    notes,
  });

  return bookmark;
};

/**
 * Remove bookmark
 */
exports.removeBookmark = async (userId, postId) => {
  const bookmark = await Bookmark.findOneAndDelete({
    user: userId,
    post: postId,
  });

  if (!bookmark) {
    throw new Error('Bookmark not found');
  }

  return bookmark;
};

/**
 * Update bookmark
 */
exports.updateBookmark = async (userId, postId, updates) => {
  const bookmark = await Bookmark.findOneAndUpdate(
    { user: userId, post: postId },
    updates,
    { new: true, runValidators: true }
  );

  if (!bookmark) {
    throw new Error('Bookmark not found');
  }

  return bookmark;
};

