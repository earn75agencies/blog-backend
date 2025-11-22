const mongoose = require('mongoose');

/**
 * Session Schema
 * For session management and history
 */
const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    device: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'other'],
      },
      name: String,
      os: String,
      browser: String,
      userAgent: String,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isTrusted: {
      type: Boolean,
      default: false,
    },
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    loginMethod: {
      type: String,
      enum: ['password', 'magic-link', 'social', 'biometric', 'api-token'],
      default: 'password',
    },
    biometricData: {
      type: {
        type: String,
        enum: ['fingerprint', 'faceid', 'voice', 'iris'],
      },
      verified: Boolean,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
sessionSchema.index({ user: 1, isActive: 1, lastActivity: -1 });
sessionSchema.index({ sessionToken: 1 }, { unique: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;

