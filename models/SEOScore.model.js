const mongoose = require('mongoose');

/**
 * SEO Score Schema
 * For tracking SEO optimization
 */
const seoScoreSchema = new mongoose.Schema(
  {
    content: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['post', 'series', 'course', 'product', 'page'],
      required: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    factors: {
      title: { score: Number, optimized: Boolean },
      metaDescription: { score: Number, optimized: Boolean },
      headings: { score: Number, optimized: Boolean },
      keywords: { score: Number, optimized: Boolean },
      images: { score: Number, optimized: Boolean },
      links: { score: Number, optimized: Boolean },
      readability: { score: Number, optimized: Boolean },
      mobile: { score: Number, optimized: Boolean },
      speed: { score: Number, optimized: Boolean },
    },
    recommendations: [
      {
        type: {
          type: String,
          enum: ['critical', 'important', 'suggestion'],
        },
        field: String,
        message: String,
        action: String,
      },
    ],
    keywords: [String],
    backlinks: {
      count: { type: Number, default: 0 },
      domains: [String],
    },
    lastAnalyzed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
seoScoreSchema.index({ contentType: 1, score: -1 });
seoScoreSchema.index({ lastAnalyzed: -1 });

const SEOScore = mongoose.model('SEOScore', seoScoreSchema);

module.exports = SEOScore;

