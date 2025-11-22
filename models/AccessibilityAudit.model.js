const mongoose = require('mongoose');

/**
 * Accessibility Audit Schema
 * For accessibility audit per post
 */
const accessibilityAuditSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      unique: true,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    issues: [
      {
        type: {
          type: String,
          enum: ['contrast', 'alt-text', 'heading', 'link', 'form', 'keyboard', 'aria', 'color', 'font', 'other'],
        },
        severity: {
          type: String,
          enum: ['error', 'warning', 'info'],
        },
        description: String,
        element: String,
        suggestion: String,
        fixed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    wcagLevel: {
      type: String,
      enum: ['A', 'AA', 'AAA', 'none'],
      default: 'none',
    },
    features: {
      altText: { type: Boolean, default: false },
      captions: { type: Boolean, default: false },
      transcripts: { type: Boolean, default: false },
      screenReader: { type: Boolean, default: false },
      keyboardNav: { type: Boolean, default: false },
      highContrast: { type: Boolean, default: false },
    },
    lastAudited: {
      type: Date,
      default: Date.now,
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
accessibilityAuditSchema.index({ post: 1 }, { unique: true });
accessibilityAuditSchema.index({ score: -1 });
accessibilityAuditSchema.index({ lastAudited: -1 });

const AccessibilityAudit = mongoose.model('AccessibilityAudit', accessibilityAuditSchema);

module.exports = AccessibilityAudit;

