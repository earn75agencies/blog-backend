const mongoose = require('mongoose');

/**
 * Network Analysis Schema
 * For tracking engagement between users, communities, posts
 */
const networkAnalysisSchema = new mongoose.Schema(
  {
    nodeType: {
      type: String,
      enum: ['user', 'post', 'community', 'hashtag'],
      required: true,
      index: true,
    },
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    connections: [
      {
        targetType: {
          type: String,
          enum: ['user', 'post', 'community', 'hashtag'],
        },
        targetId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        relationship: {
          type: String,
          enum: ['follows', 'likes', 'comments', 'shares', 'mentions', 'tags', 'belongs-to'],
        },
        strength: {
          type: Number,
          default: 1,
          min: 0,
          max: 10,
        },
        lastInteraction: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    metrics: {
      degree: { type: Number, default: 0 }, // Number of connections
      betweenness: { type: Number, default: 0 }, // Centrality measure
      closeness: { type: Number, default: 0 }, // Closeness centrality
      influence: { type: Number, default: 0 }, // Influence score
      engagement: { type: Number, default: 0 }, // Total engagement
    },
    clusters: [String], // Community detection clusters
    calculatedAt: {
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
networkAnalysisSchema.index({ nodeType: 1, nodeId: 1 }, { unique: true });
networkAnalysisSchema.index({ 'metrics.influence': -1 });
networkAnalysisSchema.index({ 'metrics.engagement': -1 });
networkAnalysisSchema.index({ calculatedAt: -1 });

const NetworkAnalysis = mongoose.model('NetworkAnalysis', networkAnalysisSchema);

module.exports = NetworkAnalysis;

