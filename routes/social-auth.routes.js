const express = require('express');
const router = express.Router();
const {
  socialLogin,
  linkSocialAccount,
  unlinkSocialAccount,
  getSessions,
  revokeSession,
  revokeAllSessions,
} = require('../controllers/social-auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Public routes
router.post('/:provider', socialLogin);
router.post('/:provider/link', authenticate, linkSocialAccount);
router.delete('/:provider/unlink', authenticate, unlinkSocialAccount);

// Session management
router.get('/sessions', authenticate, getSessions);
router.delete('/sessions/:sessionId', authenticate, revokeSession);
router.delete('/sessions', authenticate, revokeAllSessions);

module.exports = router;

