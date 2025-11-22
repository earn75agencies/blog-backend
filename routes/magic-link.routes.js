const express = require('express');
const router = express.Router();
const {
  requestMagicLink,
  verifyMagicLink,
} = require('../controllers/magic-link.controller');

router.post('/', requestMagicLink);
router.get('/:token', verifyMagicLink);

module.exports = router;

