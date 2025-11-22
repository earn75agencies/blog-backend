const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  rateProduct,
  getFeaturedProducts,
} = require('../controllers/product.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getProducts);
router.get('/featured', optionalAuth, getFeaturedProducts);
router.get('/:slug', optionalAuth, getProduct);

// Protected routes
router.post('/', authenticate, authorize('author', 'admin'), createProduct);
router.put('/:id', authenticate, authorize('author', 'admin'), updateProduct);
router.delete('/:id', authenticate, authorize('author', 'admin'), deleteProduct);
router.post('/:id/rate', authenticate, rateProduct);

module.exports = router;

