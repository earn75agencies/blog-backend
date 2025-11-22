const mongoose = require('mongoose');

/**
 * Data Export Schema
 * For data export/import operations
 */
const dataExportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: ['export', 'import'],
      required: true,
    },
    format: {
      type: String,
      enum: ['json', 'csv', 'xml', 'pdf'],
      required: true,
    },
    dataType: {
      type: String,
      enum: ['posts', 'users', 'analytics', 'media', 'all'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    fileUrl: String,
    fileSize: Number,
    filters: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    startedAt: Date,
    completedAt: Date,
    error: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
dataExportSchema.index({ user: 1, createdAt: -1 });
dataExportSchema.index({ status: 1 });

const DataExport = mongoose.model('DataExport', dataExportSchema);

module.exports = DataExport;

