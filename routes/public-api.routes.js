const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getPosts,
  getPost,
  getUsers,
  getCategories,
  getTags,
  getApiDocs,
} = require('../controllers/public-api.controller');

const router = express.Router();

// Rate limiting for public API
const publicApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour for free tier
  message: 'API rate limit exceeded. Upgrade to premium for higher limits.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
router.use(publicApiLimiter);

// Public API endpoints
router.get('/docs', getApiDocs);
router.get('/posts', getPosts);
router.get('/posts/:slug', getPost);
router.get('/users', getUsers);
router.get('/categories', getCategories);
router.get('/tags', getTags);

module.exports = router;

