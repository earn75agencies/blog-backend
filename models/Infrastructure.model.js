const mongoose = require('mongoose');

/**
 * Infrastructure Configuration Schema
 * For cloud infrastructure management
 */
const infrastructureSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      required: true,
      index: true,
    },
    cloudProvider: {
      type: String,
      enum: ['aws', 'gcp', 'azure', 'multi-cloud'],
      required: true,
    },
    regions: [String],
    services: [
      {
        name: String,
        type: {
          type: String,
          enum: ['api', 'database', 'storage', 'cdn', 'queue', 'cache'],
        },
        region: String,
        status: {
          type: String,
          enum: ['active', 'scaling', 'maintenance', 'down'],
          default: 'active',
        },
        autoScaling: {
          enabled: { type: Boolean, default: false },
          minInstances: Number,
          maxInstances: Number,
          targetCPU: Number,
        },
        healthCheck: {
          url: String,
          interval: Number,
          lastChecked: Date,
          status: String,
        },
      },
    ],
    cdn: {
      enabled: { type: Boolean, default: false },
      provider: String,
      regions: [String],
      cacheRules: [
        {
          path: String,
          ttl: Number,
        },
      ],
    },
    monitoring: {
      enabled: { type: Boolean, default: true },
      alerts: [
        {
          metric: String,
          threshold: Number,
          action: String,
        },
      ],
    },
    costTracking: {
      monthlyBudget: Number,
      currentSpend: Number,
      alerts: { type: Boolean, default: true },
    },
    version: {
      type: String,
      default: '1.0.0',
    },
    lastDeployed: Date,
    deployedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
infrastructureSchema.index({ environment: 1, cloudProvider: 1 });
infrastructureSchema.index({ 'services.status': 1 });

const Infrastructure = mongoose.model('Infrastructure', infrastructureSchema);

module.exports = Infrastructure;

