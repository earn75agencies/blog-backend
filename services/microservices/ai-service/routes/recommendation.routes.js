const express = require('express');
const router = express.Router();
const { protect } = require('../../../middleware/auth.middleware');
const {
  getRecommendedPosts,
  getRecommendedUsers,
  getTrendingContent,
} = require('../controllers/recommendation.controller');

router.use(protect);

router.get('/posts', getRecommendedPosts);
router.get('/users', getRecommendedUsers);
router.get('/trending', getTrendingContent);

module.exports = router;

