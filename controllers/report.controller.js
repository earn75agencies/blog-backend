const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const Report = require('../models/Report.model');
const Post = require('../models/Post.model');
const Comment = require('../models/Comment.model');
const User = require('../models/User.model');

/**
 * @desc    Report content
 * @route   POST /api/reports
 * @access  Private
 */
exports.createReport = asyncHandler(async (req, res) => {
  const { type, reportedItem, reason, description } = req.body;

  if (!type || !reportedItem || !reason) {
    throw new ErrorResponse('Type, reportedItem, and reason are required', 400);
  }

  // Check if already reported by this user
  const existingReport = await Report.findOne({
    reporter: req.user._id,
    type,
    reportedItem,
    status: { $in: ['pending', 'reviewing'] },
  });

  if (existingReport) {
    throw new ErrorResponse('You have already reported this item', 400);
  }

  // Verify the reported item exists
  let itemExists = false;
  switch (type) {
    case 'post':
      itemExists = await Post.findById(reportedItem);
      break;
    case 'comment':
      itemExists = await Comment.findById(reportedItem);
      break;
    case 'user':
      itemExists = await User.findById(reportedItem);
      break;
    default:
      throw new ErrorResponse('Invalid report type', 400);
  }

  if (!itemExists) {
    throw new ErrorResponse('Reported item not found', 404);
  }

  // Determine priority based on reason
  let priority = 'medium';
  if (['hate_speech', 'harassment', 'copyright_violation'].includes(reason)) {
    priority = 'high';
  } else if (reason === 'spam') {
    priority = 'low';
  }

  const report = await Report.create({
    reporter: req.user._id,
    type,
    reportedItem,
    reason,
    description,
    priority,
  });

  res.status(201).json({
    status: 'success',
    message: 'Report submitted successfully',
    data: {
      report,
    },
  });
});

/**
 * @desc    Get reports (Admin only)
 * @route   GET /api/reports
 * @access  Private/Admin
 */
exports.getReports = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const { status, type, priority } = req.query;

  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;
  if (priority) query.priority = priority;

  const [reports, total] = await Promise.all([
    Report.find(query)
      .populate('reporter', 'username avatar')
      .populate('reviewedBy', 'username')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(query),
  ]);

  res.json({
    status: 'success',
    results: reports.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      reports,
    },
  });
});

/**
 * @desc    Get single report
 * @route   GET /api/reports/:id
 * @access  Private/Admin
 */
exports.getReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate('reporter', 'username avatar email')
    .populate('reviewedBy', 'username')
    .lean();

  if (!report) {
    throw new ErrorResponse('Report not found', 404);
  }

  // Populate reported item based on type
  let reportedItem = null;
  switch (report.type) {
    case 'post':
      reportedItem = await Post.findById(report.reportedItem)
        .populate('author', 'username avatar')
        .lean();
      break;
    case 'comment':
      reportedItem = await Comment.findById(report.reportedItem)
        .populate('author', 'username avatar')
        .populate('post', 'title slug')
        .lean();
      break;
    case 'user':
      reportedItem = await User.findById(report.reportedItem)
        .select('username avatar email firstName lastName')
        .lean();
      break;
  }

  res.json({
    status: 'success',
    data: {
      report: {
        ...report,
        reportedItem,
      },
    },
  });
});

/**
 * @desc    Update report status
 * @route   PATCH /api/reports/:id
 * @access  Private/Admin
 */
exports.updateReport = asyncHandler(async (req, res) => {
  const { status, resolution } = req.body;

  const report = await Report.findById(req.params.id);
  if (!report) {
    throw new ErrorResponse('Report not found', 404);
  }

  if (status) {
    report.status = status;
    if (status === 'reviewing' || status === 'resolved') {
      report.reviewedBy = req.user._id;
      report.reviewedAt = new Date();
    }
  }

  if (resolution) {
    report.resolution = resolution;
  }

  await report.save();

  res.json({
    status: 'success',
    message: 'Report updated successfully',
    data: {
      report,
    },
  });
});

/**
 * @desc    Get my reports
 * @route   GET /api/reports/me
 * @access  Private
 */
exports.getMyReports = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments({ reporter: req.user._id }),
  ]);

  res.json({
    status: 'success',
    results: reports.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      reports,
    },
  });
});

