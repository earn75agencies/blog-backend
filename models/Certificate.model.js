const mongoose = require('mongoose');

/**
 * Certificate Schema
 * For course completion certificates
 */
const certificateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    certificateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      required: true,
    },
    completionPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    pdfUrl: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
    verified: {
      type: Boolean,
      default: true,
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
certificateSchema.index({ user: 1, issuedAt: -1 });
certificateSchema.index({ course: 1, issuedAt: -1 });
certificateSchema.index({ certificateId: 1 }, { unique: true });
certificateSchema.index({ issuedAt: -1 });
certificateSchema.index({ user: 1, course: 1 }, { unique: true });

// Pre-save middleware to generate certificate ID
certificateSchema.pre('save', async function (next) {
  if (this.isNew && !this.certificateId) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(`${this.user}-${this.course}-${Date.now()}`);
    this.certificateId = hash.digest('hex').substring(0, 16).toUpperCase();
  }
  next();
});

const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;

