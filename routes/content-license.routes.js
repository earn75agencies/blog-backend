const express = require('express');
const router = express.Router();
const {
  getContentLicense,
  setContentLicense,
} = require('../controllers/content-license.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/posts/:postId/license', getContentLicense);
router.post('/posts/:postId/license', authenticate, setContentLicense);

module.exports = router;

