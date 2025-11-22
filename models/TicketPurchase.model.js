const mongoose = require('mongoose');

/**
 * Ticket Purchase Schema
 * For tracking ticket purchases
 */
const ticketPurchaseSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    payment: {
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
      },
      transactionId: String,
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
      },
    },
    qrCode: {
      type: String,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: Date,
    attendees: [
      {
        name: String,
        email: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ticketPurchaseSchema.index({ ticket: 1, createdAt: -1 });
ticketPurchaseSchema.index({ buyer: 1, createdAt: -1 });
ticketPurchaseSchema.index({ 'payment.status': 1 });
ticketPurchaseSchema.index({ qrCode: 1 }, { unique: true, sparse: true });

const TicketPurchase = mongoose.model('TicketPurchase', ticketPurchaseSchema);

module.exports = TicketPurchase;

