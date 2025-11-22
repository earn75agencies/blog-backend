const mongoose = require('mongoose');

/**
 * Ticket Schema
 * For event ticketing and tiering
 */
const ticketSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    webinar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Webinar',
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    tier: {
      type: String,
      enum: ['early-bird', 'regular', 'vip', 'premium', 'standard'],
      default: 'regular',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    quantity: {
      total: { type: Number, required: true },
      available: { type: Number, required: true },
      sold: { type: Number, default: 0 },
    },
    benefits: [String],
    saleStart: {
      type: Date,
      required: true,
    },
    saleEnd: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ticketSchema.index({ event: 1, tier: 1 });
ticketSchema.index({ webinar: 1, tier: 1 });
ticketSchema.index({ saleStart: 1, saleEnd: 1 });
ticketSchema.index({ isActive: 1, 'quantity.available': 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;

