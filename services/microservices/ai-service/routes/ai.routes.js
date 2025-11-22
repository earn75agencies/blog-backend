const express = require('express');
const router = express.Router();
const { protect } = require('../../../middleware/auth.middleware');
const {
  generateContent,
  summarizeText,
  translateText,
  analyzeSentiment,
} = require('../controllers/ai.controller');

router.use(protect);

router.post('/generate', generateContent);
router.post('/summarize', summarizeText);
router.post('/translate', translateText);
router.post('/analyze-sentiment', analyzeSentiment);

module.exports = router;

