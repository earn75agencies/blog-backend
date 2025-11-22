const express = require('express');
const router = express.Router();
const {
  getPersonalizedContent,
  updatePreferences,
} = require('../controllers/personalization.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/content', getPersonalizedContent);
router.patch('/preferences', updatePreferences);

module.exports = router;

