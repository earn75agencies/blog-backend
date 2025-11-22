const mongoose = require('mongoose');

/**
 * Virality Score Schema
 * For tracking content virality and trending
 */
const viralityScoreSchema = new mongoose.Schema(
  {
    content: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['post', 'series', 'course', 'event', 'media'],
      required: true,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    factors: {
      shares: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      growthRate: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      velocity: { type: Number, default: 0 },
    },
    regionalScores: [
      {
        region: String,
        score: Number,
        factors: {
          type: Map,
          of: Number,
        },
      },
    ],
    predictedScore: {
      type: Number,
      default: 0,
    },
    trending: {
      type: Boolean,
      default: false,
      index: true,
    },
    trendingAt: Date,
    history: [
      {
        score: Number,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
viralityScoreSchema.index({ contentType: 1, score: -1 });
viralityScoreSchema.index({ trending: 1, score: -1 });
viralityScoreSchema.index({ createdAt: -1 });

const ViralityScore = mongoose.model('ViralityScore', viralityScoreSchema);

module.exports = ViralityScore;
