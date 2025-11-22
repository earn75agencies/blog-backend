const mongoose = require('mongoose');

/**
 * Device Schema
 * For device recognition and trust scoring
 */
const deviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceName: {
      type: String,
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'wearable', 'other'],
      required: true,
    },
    os: {
      type: String,
    },
    browser: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    fingerprint: {
      type: String,
      index: true,
    },
    isTrusted: {
      type: Boolean,
      default: false,
      index: true,
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
    firstSeen: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      index: true,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    biometricEnabled: {
      type: Boolean,
      default: false,
    },
    biometricType: {
      type: String,
      enum: ['fingerprint', 'faceid', 'voice', 'iris', 'none'],
      default: 'none',
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
    ipAddresses: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
deviceSchema.index({ user: 1, isTrusted: 1 });
deviceSchema.index({ deviceId: 1 }, { unique: true });
deviceSchema.index({ fingerprint: 1 });
deviceSchema.index({ lastSeen: -1 });

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;

