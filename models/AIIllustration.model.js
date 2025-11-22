const mongoose = require('mongoose');

/**
 * AI Illustration Schema
 * For AI-generated illustrations and infographics
 */
const aiIllustrationSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['illustration', 'infographic', 'diagram', 'chart', 'meme'],
      required: true,
    },
    prompt: {
      type: String,
      required: true,
      maxlength: [1000, 'Prompt cannot exceed 1000 characters'],
    },
    imageUrl: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    style: {
      type: String,
      enum: ['realistic', 'cartoon', 'abstract', 'minimalist', '3d', 'watercolor', 'digital'],
      default: 'realistic',
    },
    dimensions: {
      width: Number,
      height: Number,
    },
    metadata: {
      model: String,
      seed: Number,
      steps: Number,
      guidance: Number,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
aiIllustrationSchema.index({ post: 1, createdAt: -1 });
aiIllustrationSchema.index({ author: 1, createdAt: -1 });
aiIllustrationSchema.index({ type: 1, style: 1 });
aiIllustrationSchema.index({ createdAt: -1 });

const AIIllustration = mongoose.model('AIIllustration', aiIllustrationSchema);

module.exports = AIIllustration;

