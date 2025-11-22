const express = require('express');
const router = express.Router();

/**
 * @desc    Get API configuration
 * @route   GET /api/config
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    data: {
      apiBaseUrl: process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      features: {
        comments: process.env.ENABLE_COMMENTS !== 'false',
        likes: process.env.ENABLE_LIKES !== 'false',
        sharing: process.env.ENABLE_SHARING !== 'false',
        bookmarks: process.env.ENABLE_BOOKMARKS !== 'false',
        notifications: process.env.ENABLE_NOTIFICATIONS !== 'false',
        analytics: process.env.ENABLE_ANALYTICS !== 'false',
        subscriptions: process.env.ENABLE_SUBSCRIPTIONS !== 'false',
        payments: process.env.ENABLE_PAYMENTS !== 'false',
        events: process.env.ENABLE_EVENTS !== 'false',
      },
      social: {
        facebook: process.env.FACEBOOK_APP_ID || null,
        twitter: process.env.TWITTER_HANDLE || null,
        instagram: process.env.INSTAGRAM_HANDLE || null,
      },
      analytics: {
        googleAnalytics: process.env.GOOGLE_ANALYTICS_ID || null,
        googleTagManager: process.env.GOOGLE_TAG_MANAGER_ID || null,
      },
    },
  });
});

module.exports = router;

