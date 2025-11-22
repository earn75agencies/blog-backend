const mongoose = require('mongoose');

/**
 * Content Duplication Detection Schema
 * For content duplication detection
 */
const contentDuplicationSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    matches: [
      {
        post: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Post',
        },
        similarity: {
          type: Number,
          min: 0,
          max: 100,
        },
        matchedSections: [
          {
            start: Number,
            end: Number,
            content: String,
          },
        ],
        source: {
          type: String,
          enum: ['internal', 'external'],
        },
        url: String,
      },
    ],
    overallSimilarity: {
      type: Number,
      min: 0,
      max: 100,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    checkedAt: {
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
contentDuplicationSchema.index({ post: 1 }, { unique: true });
contentDuplicationSchema.index({ isFlagged: 1, overallSimilarity: -1 });
contentDuplicationSchema.index({ checkedAt: -1 });

const ContentDuplication = mongoose.model('ContentDuplication', contentDuplicationSchema);

module.exports = ContentDuplication;

