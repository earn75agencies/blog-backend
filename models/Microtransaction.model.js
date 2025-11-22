const mongoose = require('mongoose');

/**
 * Microtransaction Schema
 * For microtransactions and tipping on comments, reactions, shares
 */
const microtransactionSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.0001, 'Amount must be at least 0.0001'],
    },
    currency: {
      type: String,
      default: 'USD',
    },
    type: {
      type: String,
      enum: ['tip', 'reaction', 'comment', 'share', 'view', 'like', 'custom'],
      required: true,
      index: true,
    },
    relatedContent: {
      contentType: {
        type: String,
        enum: ['post', 'comment', 'video', 'podcast', 'stream'],
      },
      contentId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
      },
    },
    payment: {
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
      },
      transactionId: String,
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
        index: true,
      },
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
microtransactionSchema.index({ from: 1, createdAt: -1 });
microtransactionSchema.index({ to: 1, createdAt: -1 });
microtransactionSchema.index({ type: 1, createdAt: -1 });
microtransactionSchema.index({ 'relatedContent.contentId': 1, 'relatedContent.contentType': 1 });
microtransactionSchema.index({ 'payment.status': 1, createdAt: -1 });
microtransactionSchema.index({ createdAt: -1 });

const Microtransaction = mongoose.model('Microtransaction', microtransactionSchema);

module.exports = Microtransaction;

