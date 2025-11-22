const express = require('express');
const router = express.Router();
const {
  getPayments,
  getPayment,
  createPayment,
  updatePaymentStatus,
  processPaymentWebhook,
} = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.route('/')
  .get(authenticate, getPayments)
  .post(authenticate, createPayment);

router.route('/webhook')
  .post(processPaymentWebhook);

router.route('/:id')
  .get(authenticate, getPayment);

router.route('/:id/status')
  .put(authenticate, authorize('admin'), updatePaymentStatus);

module.exports = router;

