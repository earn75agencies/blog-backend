const express = require('express');
const router = express.Router();
const {
  generateTextToSpeech,
  getTextToSpeech,
  updateTextToSpeech,
} = require('../controllers/text-to-speech.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/posts/:postId/text-to-speech', authenticate, generateTextToSpeech);
router.get('/posts/:postId/text-to-speech', getTextToSpeech);
router.patch('/posts/:postId/text-to-speech', authenticate, updateTextToSpeech);

module.exports = router;

