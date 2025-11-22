const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../../middleware/auth.middleware');
const {
  getOverview,
  getPostsStats,
  getUserStats,
  getTrends,
  getGeographicStats,
} = require('../controllers/analytics.controller');

router.use(protect);
router.use(admin);

router.get('/overview', getOverview);
router.get('/posts', getPostsStats);
router.get('/users', getUserStats);
router.get('/trends', getTrends);
router.get('/geographic', getGeographicStats);

module.exports = router;

