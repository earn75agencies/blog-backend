const express = require('express');
const {
  getHashtags,
  getHashtag,
  followHashtag,
  unfollowHashtag,
  getTrendingHashtags,
} = require('../controllers/hashtag.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getHashtags);
router.get('/trending', optionalAuth, getTrendingHashtags);
router.get('/:name', optionalAuth, getHashtag);

// Protected routes
router.post('/:name/follow', authenticate, followHashtag);
router.post('/:name/unfollow', authenticate, unfollowHashtag);

module.exports = router;

