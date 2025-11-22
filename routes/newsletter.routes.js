const express = require('express');
const router = express.Router();
const {
  subscribe,
  unsubscribe,
  getSubscribers,
  sendNewsletter,
  getStatus,
} = require('../controllers/newsletter.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Public routes
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.get('/status', getStatus);

// Admin routes
router.get('/subscribers', authenticate, authorize('admin'), getSubscribers);
router.post('/send', authenticate, authorize('admin'), sendNewsletter);

module.exports = router;

