const express = require('express');
const {
  getOverview,
  getPostsStats,
  getUserStats,
  getTrends,
  getGeographicStats,
  getDeviceStats,
} = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require admin access
router.use(authenticate);
router.use(authorize('admin'));

router.get('/overview', getOverview);
router.get('/posts', getPostsStats);
router.get('/users', getUserStats);
router.get('/trends', getTrends);
router.get('/geographic', getGeographicStats);
router.get('/devices', getDeviceStats);

module.exports = router;

