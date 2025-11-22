const express = require('express');
const router = express.Router();
const {
  getTrendingContent,
  getViralityScore,
  createReferral,
  useReferral,
} = require('../controllers/virality-network.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/trending', getTrendingContent);
router.get('/:contentType/:contentId', getViralityScore);
router.post('/referrals', authenticate, createReferral);
router.post('/referrals/use', authenticate, useReferral);

module.exports = router;

