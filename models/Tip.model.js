const mongoose = require('mongoose');

/**
 * Tip/Donation Schema
 * For tipping and donating to creators
 */
const tipSchema = new mongoose.Schema(
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
      required: [true, 'Tip amount is required'],
      min: [0.01, 'Tip amount must be at least 0.01'],
    },
    currency: {
      type: String,
      default: 'USD',
    },
    type: {
      type: String,
      enum: ['tip', 'donation', 'support'],
      default: 'tip',
    },
    message: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    relatedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },
    relatedComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
    payment: {
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
      },
      transactionId: {
        type: String,
      },
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
        default: 'pending',
      },
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
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
tipSchema.index({ from: 1, createdAt: -1 });
tipSchema.index({ to: 1, createdAt: -1 });
tipSchema.index({ relatedPost: 1, createdAt: -1 });
tipSchema.index({ 'payment.status': 1, createdAt: -1 });
tipSchema.index({ createdAt: -1 });
tipSchema.index({ amount: -1 });

const Tip = mongoose.model('Tip', tipSchema);

module.exports = Tip;

