const mongoose = require('mongoose');

/**
 * Workflow Schema
 * For content approval workflows
 */
const workflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workflow name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    steps: [
      {
        name: {
          type: String,
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        approvers: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        requiredApprovals: {
          type: Number,
          default: 1,
        },
        autoApprove: {
          type: Boolean,
          default: false,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Workflow type
    workflowType: {
      type: String,
      enum: ['sequential', 'parallel', 'conditional'],
      default: 'sequential',
    },
    // Content type
    contentType: {
      type: String,
      enum: ['post', 'series', 'course', 'product', 'event', 'all'],
      default: 'all',
    },
    // Steps enhancement
    steps: [
      {
        name: {
          type: String,
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        approvers: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        requiredApprovals: {
          type: Number,
          default: 1,
        },
        autoApprove: {
          type: Boolean,
          default: false,
        },
        // New fields
        deadline: Number, // hours
        reminders: [
          {
            hoursBefore: Number,
            sent: { type: Boolean, default: false },
          },
        ],
        checklist: [String],
        conditions: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
        escalation: {
          enabled: { type: Boolean, default: false },
          afterHours: Number,
          escalateTo: mongoose.Schema.Types.ObjectId,
        },
      },
    ],
    // Templates
    isTemplate: {
      type: Boolean,
      default: false,
    },
    templateCategory: String,
    // Performance metrics
    metrics: {
      averageTime: Number, // in hours
      completionRate: { type: Number, default: 0 },
      bottleneckSteps: [String],
    },
    // Versioning
    version: {
      type: Number,
      default: 1,
    },
    parentWorkflow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
    },
    // Delegation
    delegatedRoles: [
      {
        role: String,
        permissions: [String],
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
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
workflowSchema.index({ isActive: 1, isDefault: 1 });
workflowSchema.index({ createdAt: -1 });

const Workflow = mongoose.model('Workflow', workflowSchema);

module.exports = Workflow;

