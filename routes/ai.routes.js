const express = require('express');
const {
  getContentSuggestions,
  getRecommendations,
  autoTag,
  analyzeSentiment,
  generateSEO,
  moderateContent,
  getPersonalizedDashboard,
} = require('../controllers/ai.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// AI Features
router.get('/suggestions', authorize('author', 'admin'), getContentSuggestions);
router.get('/recommendations', getRecommendations);
router.post('/auto-tag', authorize('author', 'admin'), autoTag);
router.post('/sentiment', analyzeSentiment);
router.post('/seo', authorize('author', 'admin'), generateSEO);
router.post('/moderate', authorize('admin'), moderateContent);
router.get('/dashboard', getPersonalizedDashboard);

module.exports = router;

