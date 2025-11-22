const express = require('express');
const {
  generateBlogPost,
  summarizeContent,
  translateContent,
  analyzeToxicity,
  predictTrending,
  assistWriting,
  getHyperRecommendations,
} = require('../controllers/advanced-ai.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Advanced AI Features
router.post('/generate-post', authorize('author', 'admin'), generateBlogPost);
router.post('/summarize', summarizeContent);
router.post('/translate', translateContent);
router.post('/toxicity', authorize('admin'), analyzeToxicity);
router.get('/trending-predictions', predictTrending);
router.post('/assist-writing', authorize('author', 'admin'), assistWriting);
router.get('/hyper-recommendations', getHyperRecommendations);

module.exports = router;

