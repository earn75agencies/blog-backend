const express = require('express');
const router = express.Router();
const {
  getPaidContent,
  setPaidContent,
  purchasePaidContent,
} = require('../controllers/paid-content.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/posts/:postId/paid-content', getPaidContent);
router.post('/posts/:postId/paid-content', authenticate, setPaidContent);
router.post('/posts/:postId/paid-content/purchase', authenticate, purchasePaidContent);

module.exports = router;

