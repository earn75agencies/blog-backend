const mongoose = require('mongoose');
const Workflow = require('../models/Workflow.model');
const Approval = require('../models/Approval.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Create workflow
 * @route   POST /api/workflows
 * @access  Private/Admin
 */
exports.createWorkflow = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    steps,
    workflowType,
    contentType,
    isTemplate,
  } = req.body;

  const workflow = await Workflow.create({
    name,
    description,
    steps,
    workflowType: workflowType || 'sequential',
    contentType: contentType || 'all',
    isTemplate: isTemplate || false,
    isActive: true,
  });

  res.status(201).json({
    status: 'success',
    data: { workflow },
  });
});

/**
 * @desc    Submit content for approval
 * @route   POST /api/workflows/:workflowId/submit
 * @access  Private
 */
exports.submitForApproval = asyncHandler(async (req, res) => {
  const { workflowId } = req.params;
  const { content, contentType, scheduledPublish } = req.body;

  const workflow = await Workflow.findById(workflowId);
  if (!workflow) {
    throw new ErrorResponse('Workflow not found', 404);
  }

  // Check if already submitted
  const existingApproval = await Approval.findOne({
    content,
    contentType,
  });

  if (existingApproval) {
    throw new ErrorResponse('Content already submitted for approval', 400);
  }

  // Create approval
  const approval = await Approval.create({
    content,
    contentType,
    workflow: workflowId,
    currentStep: 0,
    status: 'pending',
    scheduledPublish: scheduledPublish ? new Date(scheduledPublish) : null,
    approvals: workflow.steps.map((step, index) => ({
      step: index,
      approver: step.approvers[0], // First approver
      status: 'pending',
      deadline: step.deadline ? new Date(Date.now() + step.deadline * 60 * 60 * 1000) : null,
    })),
  });

  res.status(201).json({
    status: 'success',
    message: 'Content submitted for approval',
    data: { approval },
  });
});

/**
 * @desc    Approve content
 * @route   POST /api/approvals/:id/approve
 * @access  Private
 */
exports.approveContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comments, annotations } = req.body;

  const approval = await Approval.findById(id);
  if (!approval) {
    throw new ErrorResponse('Approval not found', 404);
  }

  const workflow = await Workflow.findById(approval.workflow);
  const currentStep = workflow.steps[approval.currentStep];

  // Check if user is approver
  const isApprover = currentStep.approvers.some(
    a => a.toString() === req.user._id.toString()
  );

  if (!isApprover && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to approve', 403);
  }

  // Update approval
  const approvalEntry = approval.approvals.find(
    a => a.step === approval.currentStep && a.approver.toString() === req.user._id.toString()
  );

  if (approvalEntry) {
    approvalEntry.status = 'approved';
    approvalEntry.comments = comments;
    approvalEntry.annotations = annotations || [];
    approvalEntry.approvedAt = new Date();
  }

  // Check if step is complete
  const approvedCount = approval.approvals.filter(
    a => a.step === approval.currentStep && a.status === 'approved'
  ).length;

  if (approvedCount >= currentStep.requiredApprovals) {
    // Move to next step
    if (approval.currentStep < workflow.steps.length - 1) {
      approval.currentStep += 1;
      approval.status = 'in-review';
    } else {
      // All steps approved
      approval.status = 'approved';
      approval.completedAt = new Date();

      // Auto-publish if enabled
      if (approval.autoPublished) {
        const contentModel = mongoose.model(approval.contentType === 'post' ? 'Post' : 'Content');
        await contentModel.findByIdAndUpdate(approval.content, {
          status: 'published',
          publishedAt: approval.scheduledPublish || new Date(),
        });
      }
    }
  }

  await approval.save();

  res.json({
    status: 'success',
    message: 'Content approved',
    data: { approval },
  });
});

/**
 * @desc    Request changes
 * @route   POST /api/approvals/:id/request-changes
 * @access  Private
 */
exports.requestChanges = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, changes } = req.body;

  const approval = await Approval.findById(id);
  if (!approval) {
    throw new ErrorResponse('Approval not found', 404);
  }

  approval.status = 'changes-requested';
  approval.changeRequests.push({
    step: approval.currentStep,
    requestedBy: req.user._id,
    requestedAt: new Date(),
    reason,
    changes,
  });

  await approval.save();

  res.json({
    status: 'success',
    message: 'Changes requested',
    data: { approval },
  });
});

/**
 * @desc    Get approval status
 * @route   GET /api/approvals/:id
 * @access  Private
 */
exports.getApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const approval = await Approval.findById(id)
    .populate('workflow')
    .populate('approvals.approver', 'username avatar')
    .populate('changeRequests.requestedBy', 'username avatar');

  if (!approval) {
    throw new ErrorResponse('Approval not found', 404);
  }

  res.json({
    status: 'success',
    data: { approval },
  });
});

