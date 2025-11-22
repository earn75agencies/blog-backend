const express = require('express');
const {
  getSeries,
  getSingleSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  addPostToSeries,
  removePostFromSeries,
  subscribeToSeries,
  unsubscribeFromSeries,
  getFeaturedSeries,
} = require('../controllers/series.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getSeries);
router.get('/featured', optionalAuth, getFeaturedSeries);
router.get('/:slug', optionalAuth, getSingleSeries);

// Protected routes
router.post('/', authenticate, authorize('author', 'admin'), createSeries);
router.put('/:id', authenticate, authorize('author', 'admin'), updateSeries);
router.delete('/:id', authenticate, authorize('author', 'admin'), deleteSeries);
router.post('/:id/posts', authenticate, authorize('author', 'admin'), addPostToSeries);
router.delete('/:id/posts/:postId', authenticate, authorize('author', 'admin'), removePostFromSeries);
router.post('/:id/subscribe', authenticate, subscribeToSeries);
router.post('/:id/unsubscribe', authenticate, unsubscribeFromSeries);

module.exports = router;

