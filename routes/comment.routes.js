const express = require('express');
const {
  getComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCommentReplies,
} = require('../controllers/comment.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createCommentValidation, updateCommentValidation } = require('../validators/comment.validator');

const router = express.Router();

// Public routes
router.get('/post/:postId', optionalAuth, getComments);
router.get('/:id/replies', optionalAuth, getCommentReplies);
router.get('/:id', optionalAuth, getComment);

// Protected routes
router.post('/', authenticate, createCommentValidation, validate, createComment);
router.put('/:id', authenticate, updateCommentValidation, validate, updateComment);
router.delete('/:id', authenticate, deleteComment);
router.post('/:id/like', authenticate, likeComment);
router.post('/:id/unlike', authenticate, unlikeComment);

module.exports = router;

