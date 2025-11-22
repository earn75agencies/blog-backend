const mongoose = require('mongoose');

/**
 * Approval Schema
 * For tracking content approvals in workflows
 */
const approvalSchema = new mongoose.Schema(
  {
    content: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['post', 'series', 'course', 'product', 'event'],
      required: true,
      index: true,
    },
    workflow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
      index: true,
    },
    currentStep: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'in-review', 'approved', 'rejected', 'changes-requested', 'cancelled'],
      default: 'pending',
      index: true,
    },
    approvals: [
      {
        step: Number,
        approver: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected', 'changes-requested'],
        },
        comments: String,
        annotations: [
          {
            type: {
              type: String,
              enum: ['note', 'suggestion', 'correction', 'highlight'],
            },
            content: String,
            position: String,
          },
        ],
        approvedAt: Date,
        deadline: Date,
      },
    ],
    changeRequests: [
      {
        step: Number,
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        requestedAt: Date,
        reason: String,
        changes: String,
        resolved: { type: Boolean, default: false },
        resolvedAt: Date,
      },
    ],
    discussion: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        message: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    autoPublished: {
      type: Boolean,
      default: false,
    },
    scheduledPublish: Date,
    auditLog: [
      {
        action: String,
        user: mongoose.Schema.Types.ObjectId,
        timestamp: { type: Date, default: Date.now },
        details: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
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
approvalSchema.index({ content: 1, contentType: 1 }, { unique: true });
approvalSchema.index({ workflow: 1, status: 1 });
approvalSchema.index({ status: 1, submittedAt: -1 });
approvalSchema.index({ 'approvals.approver': 1, 'approvals.status': 1 });
approvalSchema.index({ scheduledPublish: 1 });

const Approval = mongoose.model('Approval', approvalSchema);

module.exports = Approval;
