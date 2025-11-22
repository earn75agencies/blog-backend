const mongoose = require('mongoose');

/**
 * Webhook Schema
 * For managing webhooks and integrations
 */
const webhookSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Webhook name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    url: {
      type: String,
      required: [true, 'Webhook URL is required'],
      index: true,
    },
    events: [
      {
        type: String,
        enum: [
          'post.created',
          'post.updated',
          'post.deleted',
          'post.published',
          'user.created',
          'user.updated',
          'comment.created',
          'comment.approved',
          'order.completed',
          'payment.completed',
          'subscription.created',
          'subscription.cancelled',
        ],
      },
    ],
    secret: {
      type: String,
      required: true,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    headers: {
      type: Map,
      of: String,
    },
    lastTriggered: {
      type: Date,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      maxlength: [500, 'Error message cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
webhookSchema.index({ owner: 1, isActive: 1 });
webhookSchema.index({ url: 1, isActive: 1 });
webhookSchema.index({ 'events': 1 });
webhookSchema.index({ createdAt: -1 });

// Pre-save middleware to generate secret
webhookSchema.pre('save', async function (next) {
  if (this.isNew && !this.secret) {
    const crypto = require('crypto');
    this.secret = crypto.randomBytes(32).toString('hex');
  }
  next();
});

const Webhook = mongoose.model('Webhook', webhookSchema);

module.exports = Webhook;

