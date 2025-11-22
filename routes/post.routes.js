const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getFeaturedPosts,
  getPostsByCategory,
  getPostsByTag,
  getPostsByAuthor,
  searchPosts,
  getRelatedPosts,
  getPopularPosts,
  getTrendingPosts,
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
} = require('../controllers/post.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createPostValidation, updatePostValidation } = require('../validators/post.validator');
const { upload } = require('../config/cloudinary.config');

const router = express.Router();

// Rate limiting for post creation
const createPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 post creations per windowMs
  message: 'Too many post creation attempts, please try again later.',
});

// Rate limiting for search
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 searches per minute
  message: 'Too many search requests, please try again later.',
});

// Public routes
router.get('/', optionalAuth, getPosts);
router.get('/featured', optionalAuth, getFeaturedPosts);
router.get('/popular', optionalAuth, getPopularPosts);
router.get('/trending', optionalAuth, getTrendingPosts);
router.get('/search', searchLimiter, optionalAuth, searchPosts);
router.get('/category/:categoryId', optionalAuth, getPostsByCategory);
router.get('/tag/:tagId', optionalAuth, getPostsByTag);
router.get('/author/:authorId', optionalAuth, getPostsByAuthor);
router.get('/:id/related', optionalAuth, getRelatedPosts);
router.get('/:id/embed', optionalAuth, getEmbedCode);
router.get('/:id/oembed', optionalAuth, getOEmbed);
router.get('/:slug', optionalAuth, getPost);

// Protected routes - Author and Admin
router.post(
  '/',
  createPostLimiter,
  authenticate,
  authorize('author', 'admin'),
  upload.single('featuredImage'),
  //createPostValidation,
  validate,
  createPost
);
router.put(
  '/:id',
  authenticate,
  authorize('author', 'admin'),
  upload.single('featuredImage'),
  updatePostValidation,
  validate,
  updatePost
);
router.delete('/:id', authenticate, authorize('author', 'admin'), deletePost);
router.post('/:id/like', authenticate, likePost);
router.post('/:id/unlike', authenticate, unlikePost);
router.post('/:id/publish', authenticate, authorize('author', 'admin'), publishPost);
router.post('/:id/unpublish', authenticate, authorize('author', 'admin'), unpublishPost);
router.post('/:id/archive', authenticate, authorize('author', 'admin'), archivePost);
router.post('/:id/duplicate', authenticate, authorize('author', 'admin'), duplicatePost);
router.get('/:id/export', authenticate, authorize('author', 'admin'), exportPost);
router.post('/import', authenticate, authorize('author', 'admin'), upload.single('file'), importPost);

// Protected routes - Admin only
router.get('/drafts/all', authenticate, authorize('admin'), getDraftPosts);
router.get('/archived/all', authenticate, authorize('admin'), getArchivedPosts);
router.post('/bulk/delete', authenticate, authorize('admin'), bulkDeletePosts);
router.post('/bulk/update', authenticate, authorize('admin'), bulkUpdatePosts);

module.exports = router;
