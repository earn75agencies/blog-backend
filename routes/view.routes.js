const express = require('express');
const { trackView } = require('../controllers/view.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', optionalAuth, trackView);

module.exports = router;

