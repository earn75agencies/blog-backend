const mongoose = require('mongoose');

/**
 * Custom Dashboard Schema
 * For user-customizable dashboards
 */
const customDashboardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    widgets: [
      {
        type: {
          type: String,
          enum: ['chart', 'metric', 'table', 'list', 'map', 'heatmap'],
          required: true,
        },
        title: String,
        config: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
        position: {
          x: Number,
          y: Number,
          width: Number,
          height: Number,
        },
        dataSource: String,
        refreshInterval: Number,
      },
    ],
    layout: {
      columns: { type: Number, default: 3 },
      spacing: { type: Number, default: 16 },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
customDashboardSchema.index({ user: 1, isDefault: 1 });
customDashboardSchema.index({ isPublic: 1, createdAt: -1 });

const CustomDashboard = mongoose.model('CustomDashboard', customDashboardSchema);

module.exports = CustomDashboard;

