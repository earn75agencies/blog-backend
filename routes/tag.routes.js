const express = require('express');
const {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  getTagPosts,
  getPopularTags,
  searchTags,
  autocompleteTags,
  getTopTags,
} = require('../controllers/tag.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createTagValidation, updateTagValidation } = require('../validators/tag.validator');

const router = express.Router();

// Public routes - order matters! More specific routes first
router.get('/search', optionalAuth, searchTags);
router.get('/autocomplete', optionalAuth, autocompleteTags);
router.get('/top', optionalAuth, getTopTags);
router.get('/popular', optionalAuth, getPopularTags);
router.get('/:id/posts', optionalAuth, getTagPosts);
router.get('/:slug', optionalAuth, getTag);
router.get('/', optionalAuth, getTags);

// Protected routes (admin only)
router.post('/', authenticate, authorize('admin'), createTagValidation, validate, createTag);
router.put('/:id', authenticate, authorize('admin'), updateTagValidation, validate, updateTag);
router.delete('/:id', authenticate, authorize('admin'), deleteTag);

module.exports = router;

