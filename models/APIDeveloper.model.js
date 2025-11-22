const mongoose = require('mongoose');

/**
 * API Developer Schema
 * For managing developer accounts and API keys
 */
const apiDeveloperSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    apiKeys: [
      {
        key: {
          type: String,
          required: true,
          unique: true,
        },
        name: String,
        scopes: [String],
        rateLimit: {
          requests: { type: Number, default: 1000 },
          period: { type: String, enum: ['hour', 'day', 'month'], default: 'hour' },
        },
        isActive: { type: Boolean, default: true },
        lastUsed: Date,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    webhooks: [
      {
        url: String,
        events: [String],
        secret: String,
        isActive: { type: Boolean, default: true },
        lastTriggered: Date,
        failureCount: { type: Number, default: 0 },
      },
    ],
    usage: {
      totalRequests: { type: Number, default: 0 },
      successfulRequests: { type: Number, default: 0 },
      failedRequests: { type: Number, default: 0 },
      lastRequest: Date,
    },
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free',
    },
    sandboxAccess: {
      type: Boolean,
      default: true,
    },
    badges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Badge',
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
apiDeveloperSchema.index({ 'apiKeys.key': 1 });
apiDeveloperSchema.index({ plan: 1 });

const APIDeveloper = mongoose.model('APIDeveloper', apiDeveloperSchema);

module.exports = APIDeveloper;

