const mongoose = require('mongoose');

/**
 * Report Schema
 * For reporting inappropriate content
 */
const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['post', 'comment', 'user', 'series', 'course'],
      required: true,
    },
    reportedItem: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        'spam',
        'harassment',
        'hate_speech',
        'inappropriate_content',
        'copyright_violation',
        'misinformation',
        'other',
      ],
      required: true,
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    resolution: {
      type: String,
      maxlength: [500, 'Resolution cannot exceed 500 characters'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
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
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ type: 1, reportedItem: 1 });
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });
reportSchema.index({ reviewedBy: 1, reviewedAt: -1 });
reportSchema.index({ createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;

