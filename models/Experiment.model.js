const mongoose = require('mongoose');

/**
 * A/B Testing Experiment Schema
 */
const experimentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Experiment name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    hypothesis: {
      type: String,
      required: true,
      maxlength: [500, 'Hypothesis cannot exceed 500 characters'],
    },
    variants: [
      {
        name: String,
        description: String,
        configuration: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
      },
    ],
    trafficSplit: {
      type: Map,
      of: Number,
      default: { a: 50, b: 50 },
    },
    targetAudience: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    metrics: [
      {
        name: String,
        event: String,
        type: {
          type: String,
          enum: ['conversion', 'average', 'count'],
        },
        goal: Number,
      },
    ],
    duration: {
      type: Number, // in days
      default: 7,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    assignments: {
      type: Map,
      of: Number,
      default: {},
    },
    results: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Enhanced features
    type: {
      type: String,
      enum: ['ab', 'multivariate', 'feature-flag'],
      default: 'ab',
    },
    // Segmentation
    segments: [
      {
        name: String,
        criteria: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
        trafficPercentage: Number,
      },
    ],
    // Custom metrics
    customMetrics: [
      {
        name: String,
        event: String,
        aggregation: {
          type: String,
          enum: ['sum', 'average', 'count', 'unique'],
        },
      },
    ],
    // Statistical analysis
    statisticalAnalysis: {
      confidenceLevel: { type: Number, default: 95 },
      significance: Number,
      pValue: Number,
      winner: String,
      isSignificant: Boolean,
    },
    // Scheduling
    schedule: {
      startDate: Date,
      endDate: Date,
      autoStart: { type: Boolean, default: false },
      autoEnd: { type: Boolean, default: false },
    },
    // Rollout
    rollout: {
      percentage: { type: Number, default: 0, min: 0, max: 100 },
      gradual: { type: Boolean, default: false },
      increment: Number,
      incrementInterval: Number, // hours
    },
    // Feature flags
    featureFlags: [
      {
        name: String,
        enabled: Boolean,
        config: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
      },
    ],
    // Documentation
    documentation: {
      hypothesis: String,
      goals: [String],
      notes: String,
      tags: [String],
    },
    // Collaboration
    collaborators: [
      {
        user: mongoose.Schema.Types.ObjectId,
        role: {
          type: String,
          enum: ['viewer', 'editor', 'admin'],
        },
      },
    ],
    // Versioning
    version: {
      type: Number,
      default: 1,
    },
    parentExperiment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Experiment',
    },
    // Notifications
    notifications: {
      onStart: { type: Boolean, default: true },
      onEnd: { type: Boolean, default: true },
      onSignificance: { type: Boolean, default: true },
      recipients: [String],
    },
    // Export
    exportFormats: [
      {
        type: String,
        enum: ['csv', 'json', 'pdf'],
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
experimentSchema.index({ status: 1, startDate: -1 });
experimentSchema.index({ createdBy: 1, createdAt: -1 });
experimentSchema.index({ createdAt: -1 });

const Experiment = mongoose.model('Experiment', experimentSchema);

module.exports = Experiment;

