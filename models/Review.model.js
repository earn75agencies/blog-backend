const mongoose = require('mongoose');

/**
 * Review Schema
 * For product, course, and service reviews
 */
const reviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewedItem: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reviewType: {
      type: String,
      enum: ['product', 'course', 'service', 'post'],
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    review: {
      type: String,
      maxlength: [2000, 'Review cannot exceed 2000 characters'],
    },
    pros: [String],
    cons: [String],
    isVerified: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    helpful: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        isHelpful: {
          type: Boolean,
          required: true,
        },
      },
    ],
    helpfulCount: {
      type: Number,
      default: 0,
    },
    images: [String],
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
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ reviewedItem: 1, reviewType: 1 });
reviewSchema.index({ reviewType: 1, rating: -1 });
reviewSchema.index({ isPublished: 1, createdAt: -1 });
reviewSchema.index({ helpfulCount: -1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ reviewer: 1, reviewedItem: 1, reviewType: 1 }, { unique: true });

// Method to mark helpful
reviewSchema.methods.markHelpful = async function (userId, isHelpful) {
  const existing = this.helpful.find((h) => h.user.toString() === userId.toString());
  if (existing) {
    if (existing.isHelpful !== isHelpful) {
      existing.isHelpful = isHelpful;
      if (isHelpful) {
        this.helpfulCount += 1;
      } else {
        this.helpfulCount = Math.max(0, this.helpfulCount - 1);
      }
    }
  } else {
    this.helpful.push({ user: userId, isHelpful });
    if (isHelpful) {
      this.helpfulCount += 1;
    }
  }
  await this.save();
  return this;
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

