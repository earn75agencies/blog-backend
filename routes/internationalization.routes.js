const express = require('express');
const router = express.Router();
const {
  translateContent,
  getTranslations,
  setLanguagePreference,
} = require('../controllers/internationalization.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/translate', authenticate, translateContent);
router.get('/:contentType/:contentId', getTranslations);
router.patch('/preferences', authenticate, setLanguagePreference);

module.exports = router;

