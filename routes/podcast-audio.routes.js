const express = require('express');
const router = express.Router();
const {
  createPodcast,
  getPodcasts,
  getPodcastAnalytics,
} = require('../controllers/podcast-audio.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/', authenticate, createPodcast);
router.get('/', getPodcasts);
router.get('/:id/analytics', authenticate, getPodcastAnalytics);

module.exports = router;

