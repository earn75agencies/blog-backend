const express = require('express');
const {
  getRecommendations,
  getTrendingPosts,
  getSimilarPosts,
} = require('../controllers/recommendation.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/trending', optionalAuth, getTrendingPosts);
router.get('/similar/:postId', optionalAuth, getSimilarPosts);

// Protected routes
router.get('/', authenticate, getRecommendations);

module.exports = router;



