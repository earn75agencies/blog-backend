const CustomDashboard = require('../models/CustomDashboard.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Create custom dashboard
 * @route   POST /api/dashboards
 * @access  Private
 */
exports.createDashboard = asyncHandler(async (req, res) => {
  const { name, widgets, layout, isDefault, isPublic } = req.body;

  // If setting as default, unset other defaults
  if (isDefault) {
    await CustomDashboard.updateMany(
      { user: req.user._id, isDefault: true },
      { isDefault: false }
    );
  }

  const dashboard = await CustomDashboard.create({
    user: req.user._id,
    name,
    widgets: widgets || [],
    layout: layout || { columns: 3, spacing: 16 },
    isDefault: isDefault || false,
    isPublic: isPublic || false,
  });

  res.status(201).json({
    status: 'success',
    data: { dashboard },
  });
});

/**
 * @desc    Get user dashboards
 * @route   GET /api/dashboards
 * @access  Private
 */
exports.getDashboards = asyncHandler(async (req, res) => {
  const { includePublic } = req.query;

  const query = { user: req.user._id };
  if (includePublic === 'true') {
    query.$or = [
      { user: req.user._id },
      { isPublic: true },
    ];
  }

  const dashboards = await CustomDashboard.find(query)
    .populate('sharedWith', 'username avatar')
    .sort({ isDefault: -1, createdAt: -1 });

  res.json({
    status: 'success',
    data: { dashboards },
  });
});

/**
 * @desc    Update dashboard
 * @route   PATCH /api/dashboards/:id
 * @access  Private
 */
exports.updateDashboard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, widgets, layout, isDefault, isPublic } = req.body;

  const dashboard = await CustomDashboard.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!dashboard) {
    throw new ErrorResponse('Dashboard not found', 404);
  }

  if (name) dashboard.name = name;
  if (widgets) dashboard.widgets = widgets;
  if (layout) dashboard.layout = layout;
  if (isDefault !== undefined) {
    dashboard.isDefault = isDefault;
    if (isDefault) {
      await CustomDashboard.updateMany(
        { user: req.user._id, _id: { $ne: id }, isDefault: true },
        { isDefault: false }
      );
    }
  }
  if (isPublic !== undefined) dashboard.isPublic = isPublic;

  await dashboard.save();

  res.json({
    status: 'success',
    data: { dashboard },
  });
});

