const mongoose = require('mongoose');

/**
 * Scheduled Post Schema
 * For scheduled community posts
 */
const scheduledPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      index: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    status: {
      type: String,
      enum: ['scheduled', 'published', 'failed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    publishedAt: Date,
    failedReason: String,
    retryCount: {
      type: Number,
      default: 0,
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
scheduledPostSchema.index({ author: 1, scheduledFor: 1 });
scheduledPostSchema.index({ community: 1, scheduledFor: 1 });
scheduledPostSchema.index({ status: 1, scheduledFor: 1 });
scheduledPostSchema.index({ scheduledFor: 1 });

const ScheduledPost = mongoose.model('ScheduledPost', scheduledPostSchema);

module.exports = ScheduledPost;

