const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const { createLimiter, commentLimiter } = require('../middleware/rateLimiter');
const { upload } = require('../config/cloudinary.config');
const validate = require('../middleware/validation.middleware');
const { createPostValidation, updatePostValidation } = require('../validators/post.validator');

// Import all controller functions
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  getFeaturedPosts,
  toggleFeatured,
  getPostsByAuthor,
  getPostsByCategory,
  addComment,
  deleteComment,
  trackShare,
  getPostShares,
  getPostLikes,
  getLikedPosts,
  getMostLiked,
  getMostShared,
  getTrendingPosts,
  searchPosts,
  getRelatedPosts,
  getPopularPosts,
  getArchivedPosts,
  getDraftPosts,
  publishPost,
  unpublishPost,
  archivePost,
  duplicatePost,
  exportPost,
  importPost,
  bulkDeletePosts,
  bulkUpdatePosts,
  getEmbedCode,
  getOEmbed,
  // Aliases for backward compatibility
  getAllPosts,
  getPostById,
  getPostBySlug
} = require('../controllers/post.controller');

const router = express.Router();

// Rate limiting configurations
const createPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 post creations per windowMs
  message: 'Too many post creation attempts, please try again later.',
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 searches per minute
  message: 'Too many search requests, please try again later.',
});

// ============================================
// PUBLIC ROUTES
// ============================================

// Main post listing routes
router.get('/', optionalAuth, getPosts);
router.get('/featured', optionalAuth, getFeaturedPosts);
router.get('/popular', optionalAuth, getPopularPosts);
router.get('/trending', optionalAuth, getTrendingPosts);

// Most liked and shared posts
router.get('/most-liked', optionalAuth, getMostLiked);
router.get('/most-shared', optionalAuth, getMostShared);

// Search and filtering
router.get('/search', searchLimiter, optionalAuth, searchPosts);
router.get('/category/:category', optionalAuth, getPostsByCategory);
router.get('/category/:categoryId', optionalAuth, getPostsByCategory); // Alternative route
router.get('/author/:authorId', optionalAuth, getPostsByAuthor);

// Post details and related content
router.get('/:id/related', optionalAuth, getRelatedPosts);
router.get('/:id/shares', optionalAuth, getPostShares);
router.get('/:id/likes', optionalAuth, getPostLikes);
router.post('/:id/share', trackShare); // Public - anyone can track shares
router.get('/:id/embed', optionalAuth, getEmbedCode);
router.get('/:id/oembed', optionalAuth, getOEmbed);

// Post access by ID or slug
router.get('/:id', optionalAuth, getPost);
router.get('/slug/:slug', optionalAuth, getPost); // Alternative route

// Backward compatibility aliases
router.get('/all', optionalAuth, getAllPosts);
router.get('/by-id/:id', optionalAuth, getPostById);
router.get('/by-slug/:slug', optionalAuth, getPostBySlug);

// ============================================
// PROTECTED ROUTES - AUTHENTICATED USERS
// ============================================

// Like/unlike functionality
router.post('/:id/like', protect, toggleLike);
router.post('/:id/unlike', protect, toggleLike); // Using same controller function

// Comment functionality
router.post('/:id/comments', protect, commentLimiter, addComment);
router.delete('/:id/comments/:commentId', protect, deleteComment);

// User-specific content
router.get('/liked/me', protect, getLikedPosts);

// ============================================
// PROTECTED ROUTES - AUTHORS AND ADMINS
// ============================================

// Post creation and management
router.post(
  '/',
  protect,
  createPostLimiter,
  upload.single('featuredImage'),
  createPostValidation,
  validate,
  createPost
);

router.put(
  '/:id',
  protect,
  upload.single('featuredImage'),
  updatePostValidation,
  validate,
  updatePost
);

router.delete('/:id', protect, deletePost);

// Post status management
router.post('/:id/publish', protect, publishPost);
router.post('/:id/unpublish', protect, unpublishPost);
router.post('/:id/archive', protect, archivePost);
router.post('/:id/duplicate', protect, duplicatePost);

// Import/export functionality
router.get('/:id/export', protect, exportPost);
router.post('/import', protect, upload.single('file'), importPost);

// ============================================
// ADMIN-ONLY ROUTES
// ============================================

// Featured post management
router.put('/:id/featured', protect, admin, toggleFeatured);

// Admin content management
router.get('/drafts/all', protect, admin, getDraftPosts);
router.get('/archived/all', protect, admin, getArchivedPosts);
router.post('/bulk/delete', protect, admin, bulkDeletePosts);
router.post('/bulk/update', protect, admin, bulkUpdatePosts);

module.exports = router;