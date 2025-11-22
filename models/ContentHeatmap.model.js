const mongoose = require('mongoose');

/**
 * Content Heatmap Schema
 * For heatmap analytics per post
 */
const contentHeatmapSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    scrollData: [
      {
        position: Number, // percentage of page
        views: { type: Number, default: 0 },
        timeSpent: { type: Number, default: 0 }, // in seconds
      },
    ],
    clickData: [
      {
        element: String,
        selector: String,
        clicks: { type: Number, default: 0 },
        position: {
          x: Number,
          y: Number,
        },
      },
    ],
    readingTime: {
      average: { type: Number, default: 0 },
      median: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    engagementZones: [
      {
        zone: {
          type: String,
          enum: ['header', 'intro', 'body', 'conclusion', 'sidebar', 'footer'],
        },
        engagement: { type: Number, default: 0 },
        timeSpent: { type: Number, default: 0 },
      },
    ],
    deviceBreakdown: {
      desktop: { views: Number, avgTime: Number },
      mobile: { views: Number, avgTime: Number },
      tablet: { views: Number, avgTime: Number },
    },
    lastUpdated: {
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
contentHeatmapSchema.index({ post: 1 }, { unique: true });
contentHeatmapSchema.index({ lastUpdated: -1 });

const ContentHeatmap = mongoose.model('ContentHeatmap', contentHeatmapSchema);

module.exports = ContentHeatmap;

