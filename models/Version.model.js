const mongoose = require('mongoose');

/**
 * Version Control Schema
 * For tracking post/content versions and history
 */
const versionSchema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['post', 'series', 'course', 'page'],
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
    },
    content: {
      type: String,
    },
    excerpt: {
      type: String,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changeDescription: {
      type: String,
      maxlength: [500, 'Change description cannot exceed 500 characters'],
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    restoredAt: {
      type: Date,
    },
    restoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
versionSchema.index({ contentId: 1, contentType: 1, version: -1 });
versionSchema.index({ contentId: 1, contentType: 1, isCurrent: 1 });
versionSchema.index({ author: 1, createdAt: -1 });
versionSchema.index({ createdAt: -1 });

// Compound unique index
versionSchema.index({ contentId: 1, contentType: 1, version: 1 }, { unique: true });

const Version = mongoose.model('Version', versionSchema);

module.exports = Version;

