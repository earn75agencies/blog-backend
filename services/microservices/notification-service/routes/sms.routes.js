const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const {
  sendSMS,
  getSMSStatus,
} = require('../controllers/sms.controller');

// Send SMS
router.post('/send', authenticate, sendSMS);

// Get SMS status
router.get('/status/:messageId', authenticate, getSMSStatus);

module.exports = router;

