const express = require('express');
const router = express.Router();
const {
  getTrendingHashtags,
  getHashtagAnalytics,
  followHashtag,
  subscribeHashtag,
  suggestHashtags,
  getMentions,
  markMentionRead,
} = require('../controllers/hashtag-mention.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/trending', getTrendingHashtags);
router.get('/:name/analytics', getHashtagAnalytics);
router.post('/:name/follow', authenticate, followHashtag);
router.post('/:name/subscribe', authenticate, subscribeHashtag);
router.post('/suggest', authenticate, suggestHashtags);
router.get('/mentions', authenticate, getMentions);
router.patch('/mentions/:id/read', authenticate, markMentionRead);

module.exports = router;

