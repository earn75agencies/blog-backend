const DataExport = require('../models/DataExport.model');
const Post = require('../models/Post.model');
const User = require('../models/User.model');
const Media = require('../models/Media.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Export data
 * @route   POST /api/data/export
 * @access  Private
 */
exports.exportData = asyncHandler(async (req, res) => {
  const { format, dataType, filters } = req.body;

  const exportJob = await DataExport.create({
    user: req.user._id,
    type: 'export',
    format: format || 'json',
    dataType: dataType || 'all',
    filters: filters || {},
    status: 'pending',
    startedAt: new Date(),
  });

  // In production, this would be processed asynchronously
  // For now, simulate processing
  let data = {};

  if (dataType === 'posts' || dataType === 'all') {
    const query = { author: req.user._id };
    if (filters?.dateFrom) query.createdAt = { $gte: new Date(filters.dateFrom) };
    if (filters?.dateTo) {
      query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
    }
    data.posts = await Post.find(query).lean();
  }

  if (dataType === 'users' || dataType === 'all') {
    if (req.user.role === 'admin') {
      data.users = await User.find({}).select('-password').lean();
    }
  }

  if (dataType === 'media' || dataType === 'all') {
    const query = { uploader: req.user._id };
    data.media = await Media.find(query).lean();
  }

  exportJob.status = 'completed';
  exportJob.completedAt = new Date();
  exportJob.fileSize = JSON.stringify(data).length;
  await exportJob.save();

  res.json({
    status: 'success',
    message: 'Data export completed',
    data: {
      export: exportJob,
      data: format === 'json' ? data : null,
    },
  });
});

/**
 * @desc    Get export history
 * @route   GET /api/data/exports
 * @access  Private
 */
exports.getExportHistory = asyncHandler(async (req, res) => {
  const exports = await DataExport.find({
    user: req.user._id,
    type: 'export',
  })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({
    status: 'success',
    data: { exports },
  });
});

