const express = require('express');
const {
  getBookmarks,
  addBookmark,
  removeBookmark,
  updateBookmark,
  checkBookmark,
  getBookmarkFolders,
} = require('../controllers/bookmark.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user bookmarks
router.get('/', getBookmarks);

// Get bookmark folders
router.get('/folders', getBookmarkFolders);

// Check if post is bookmarked
router.get('/check/:postId', checkBookmark);

// Add bookmark
router.post('/:postId', addBookmark);

// Remove bookmark
router.delete('/:postId', removeBookmark);

// Update bookmark (folder, notes, etc.)
router.put('/:postId', updateBookmark);

module.exports = router;
