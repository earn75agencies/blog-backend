const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const {
  sendEmail,
  sendBulkEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../controllers/email.controller');

// Send single email (authenticated users only)
router.post('/send', authenticate, sendEmail);

// Send bulk email (admin only)
router.post('/bulk', authenticate, authorize('admin'), sendBulkEmail);

// Send verification email (public endpoint, typically called by auth service)
router.post('/verification', sendVerificationEmail);

// Send password reset email (public endpoint)
router.post('/password-reset', sendPasswordResetEmail);

module.exports = router;

