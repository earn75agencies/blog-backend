const mongoose = require('mongoose');

/**
 * Analytics Report Schema
 * For custom analytics reports and dashboards
 */
const analyticsReportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['post', 'user', 'engagement', 'revenue', 'traffic', 'custom'],
      required: true,
    },
    metrics: [
      {
        name: String,
        type: {
          type: String,
          enum: ['count', 'sum', 'average', 'percentage', 'trend'],
        },
        source: String,
        filters: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
      },
    ],
    timeframe: {
      start: Date,
      end: Date,
      period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
      },
    },
    filters: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    visualization: {
      type: {
        type: String,
        enum: ['line', 'bar', 'pie', 'table', 'heatmap', 'funnel'],
      },
      config: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
      },
    },
    isScheduled: {
      type: Boolean,
      default: false,
    },
    schedule: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
      },
      day: Number,
      time: String,
      recipients: [String],
    },
    lastGenerated: Date,
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
analyticsReportSchema.index({ user: 1, createdAt: -1 });
analyticsReportSchema.index({ type: 1, createdAt: -1 });
analyticsReportSchema.index({ isScheduled: 1, 'schedule.frequency': 1 });

const AnalyticsReport = mongoose.model('AnalyticsReport', analyticsReportSchema);

module.exports = AnalyticsReport;

