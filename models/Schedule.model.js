const mongoose = require('mongoose');

/**
 * Schedule Schema
 * For scheduling posts and content publication
 */
const scheduleSchema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['post', 'series', 'course', 'newsletter'],
      required: true,
      index: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['scheduled', 'published', 'cancelled', 'failed'],
      default: 'scheduled',
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    errorMessage: {
      type: String,
      maxlength: [500, 'Error message cannot exceed 500 characters'],
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
scheduleSchema.index({ scheduledAt: 1, status: 1 });
scheduleSchema.index({ author: 1, scheduledAt: -1 });
scheduleSchema.index({ status: 1, scheduledAt: 1 });
scheduleSchema.index({ createdAt: -1 });

// Method to mark as published
scheduleSchema.methods.markAsPublished = async function () {
  this.status = 'published';
  this.publishedAt = new Date();
  await this.save();
  return this;
};

// Method to mark as failed
scheduleSchema.methods.markAsFailed = async function (errorMessage) {
  this.status = 'failed';
  this.retryCount += 1;
  if (errorMessage) {
    this.errorMessage = errorMessage;
  }
  await this.save();
  return this;
};

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;

