const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductRecommendations,
  applyCoupon,
  getProductAnalytics,
} = require('../controllers/product-ecommerce.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', getProducts);
router.get('/:id/recommendations', getProductRecommendations);
router.post('/:id/apply-coupon', authenticate, applyCoupon);
router.get('/:id/analytics', authenticate, getProductAnalytics);

module.exports = router;

