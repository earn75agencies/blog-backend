/**
 * AI Routes - Complete with Real AI Services
 */

const express = require('express');
const {
  semanticSearch,
  getPostRecommendations,
  getContentSuggestions,
  optimizeSEO,
  analyzeSentiment,
  moderateContent,
  predictVirality,
  generatePodcast,
  autoTag,
  getRecommendations,
  getPersonalizedDashboard,
  reindexPosts,
  getServiceStatus,
} = require('../controllers/ai.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// ===== PUBLIC/OPTIONAL AUTH ROUTES =====

// Semantic search - available to all (with optional auth for personalization)
router.get('/search', optionalAuth, semanticSearch);

// Post recommendations - public
router.get('/recommendations/post/:postId', optionalAuth, getPostRecommendations);

// ===== PROTECTED ROUTES - ALL AUTHENTICATED USERS =====

// User personalized recommendations
router.get('/recommendations', authenticate, getRecommendations);

// Personalized dashboard
router.get('/dashboard', authenticate, getPersonalizedDashboard);

// Sentiment analysis
router.post('/sentiment', authenticate, analyzeSentiment);

// ===== PROTECTED ROUTES - AUTHORS & ADMINS =====

// Content suggestions
router.post('/suggestions', authenticate, authorize('author', 'admin'), getContentSuggestions);

// SEO optimization
router.post('/seo/optimize', authenticate, authorize('author', 'admin'), optimizeSEO);

// Auto-tag content
router.post('/auto-tag', authenticate, authorize('author', 'admin'), autoTag);

// Virality prediction
router.post('/virality/:postId', authenticate, authorize('author', 'admin'), predictVirality);

// Podcast generation
router.post('/podcast/:postId', authenticate, authorize('author', 'admin'), generatePodcast);

// ===== PROTECTED ROUTES - ADMIN ONLY =====

// Content moderation
router.post('/moderate', authenticate, authorize('admin'), moderateContent);

// Reindex all posts
router.post('/reindex', authenticate, authorize('admin'), reindexPosts);

// Service status
router.get('/status', authenticate, authorize('admin'), getServiceStatus);

module.exports = router;