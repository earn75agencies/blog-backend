const express = require('express');
const router = express.Router();
const {
  analyzeSEO,
  getSEORecommendations,
} = require('../controllers/seo-optimization.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/analyze', analyzeSEO);
router.get('/:contentType/:contentId/recommendations', getSEORecommendations);

module.exports = router;

