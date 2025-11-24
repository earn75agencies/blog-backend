const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const Payment = require('../models/Payment.model');

/**
 * @desc    Get all payments
 * @route   GET /api/payments
 * @access  Private (User's own payments or Admin)
 */
exports.getPayments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  
  const query = req.user.role === 'admin' ? {} : { user: req.user._id };
  if (status) query.status = status;

  const payments = await Payment.find(query)
    .populate('user', 'username email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  const count = await Payment.countDocuments(query);

  // Add Gidix organization info to each payment
  const paymentsWithGidix = payments.map(payment => ({
    ...payment.toObject(),
    paymentProcessor: 'Gidix Organization',
    paymentRecipient: 'Gidix Organization',
    supportContact: 'payments@gidix.com',
    processedBy: 'Gidix Payment System'
  }));

  res.status(200).json({
    status: 'success',
    data: {
      payments: paymentsWithGidix,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalPayments: count,
      paymentProcessor: 'Gidix Organization',
      organizationInfo: {
        name: 'Gidix Organization',
        contactEmail: 'payments@gidix.com',
        supportUrl: 'https://gidix.com/support',
        paymentPolicy: 'All payments are processed securely by Gidix Organization'
      }
    },
  });
});

/**
 * @desc    Get single payment
 * @route   GET /api/payments/:id
 * @access  Private (User or Admin)
 */
exports.getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('user', 'username email');

  if (!payment) {
    throw new ErrorResponse('Payment not found', 404);
  }

  if (payment.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to access this payment', 403);
  }

  // Add Gidix organization info
  const paymentWithGidix = {
    ...payment.toObject(),
    paymentProcessor: 'Gidix Organization',
    paymentRecipient: 'Gidix Organization',
    supportContact: 'payments@gidix.com',
    processedBy: 'Gidix Payment System',
    organizationInfo: {
      name: 'Gidix Organization',
      contactEmail: 'payments@gidix.com',
      supportUrl: 'https://gidix.com/support',
      paymentPolicy: 'All payments are processed securely by Gidix Organization'
    }
  };

  res.status(200).json({
    status: 'success',
    data: { payment: paymentWithGidix },
  });
});

/**
 * @desc    Create payment
 * @route   POST /api/payments
 * @access  Private
 */
exports.createPayment = asyncHandler(async (req, res) => {
  req.body.user = req.user._id;
  
  // Add Gidix organization payment info
  req.body.paymentProcessor = 'Gidix Organization';
  req.body.paymentRecipient = 'Gidix Organization';
  req.body.processedBy = 'Gidix Payment System';

  const payment = await Payment.create(req.body);

  // Add Gidix info to response
  const paymentWithGidix = {
    ...payment.toObject(),
    paymentProcessor: 'Gidix Organization',
    paymentRecipient: 'Gidix Organization',
    supportContact: 'payments@gidix.com',
    organizationInfo: {
      name: 'Gidix Organization',
      contactEmail: 'payments@gidix.com',
      supportUrl: 'https://gidix.com/support'
    }
  };

  res.status(201).json({
    status: 'success',
    data: { payment: paymentWithGidix },
    message: 'Payment created successfully. All payments are processed by Gidix Organization.',
  });
});

/**
 * @desc    Update payment status
 * @route   PUT /api/payments/:id/status
 * @access  Private (Admin or Payment Provider)
 */
exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    throw new ErrorResponse('Payment not found', 404);
  }

  payment.status = status;
  if (status === 'refunded' && req.body.refundedAmount) {
    payment.refundedAmount = req.body.refundedAmount;
    payment.refundedAt = new Date();
  }

  await payment.save();

  res.status(200).json({
    status: 'success',
    data: { payment },
  });
});

/**
 * @desc    Process payment webhook
 * @route   POST /api/payments/webhook
 * @access  Public (Payment Provider)
 */
exports.processPaymentWebhook = asyncHandler(async (req, res) => {
  // Handle payment provider webhook
  const { transactionId, status, amount } = req.body;

  const payment = await Payment.findOne({ transactionId });

  if (!payment) {
    return res.status(404).json({
      status: 'error',
      message: 'Payment not found',
    });
  }

  payment.status = status;
  payment.providerResponse = req.body;
  await payment.save();

  res.status(200).json({
    status: 'success',
    message: 'Webhook processed',
  });
});

