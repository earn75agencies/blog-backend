const mongoose = require('mongoose');

/**
 * Payment Schema
 */
const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount must be positive'],
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
    },
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'other'],
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    orderId: {
      type: String,
    },
    paymentProvider: {
      type: String,
    },
    providerResponse: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
    refundedAt: {
      type: Date,
    },
    // Gidix Organization fields
    paymentProcessor: {
      type: String,
      default: 'Gidix Organization',
    },
    paymentRecipient: {
      type: String,
      default: 'Gidix Organization',
    },
    supportContact: {
      type: String,
      default: 'payments@gidix.com',
    },
    processedBy: {
      type: String,
      default: 'Gidix Payment System',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ paymentProvider: 1 });
paymentSchema.index({ subscriptionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

