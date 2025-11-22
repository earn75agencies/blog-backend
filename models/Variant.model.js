const mongoose = require('mongoose');

/**
 * A/B Testing Variant Schema
 */
const variantSchema = new mongoose.Schema(
  {
    experiment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Experiment',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    configuration: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    trafficPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    assignments: {
      type: Number,
      default: 0,
    },
    events: {
      type: Map,
      of: {
        count: { type: Number, default: 0 },
        data: [
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            },
            timestamp: Date,
            data: {
              type: Map,
              of: mongoose.Schema.Types.Mixed,
            },
          },
        ],
      },
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
variantSchema.index({ experiment: 1, name: 1 }, { unique: true });
variantSchema.index({ experiment: 1 });

const Variant = mongoose.model('Variant', variantSchema);

module.exports = Variant;

