const Infrastructure = require('../models/Infrastructure.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Create infrastructure configuration
 * @route   POST /api/infrastructure
 * @access  Private/Admin
 */
exports.createInfrastructure = asyncHandler(async (req, res) => {
  const {
    name,
    environment,
    cloudProvider,
    regions,
    services,
    cdn,
    monitoring,
    costTracking,
  } = req.body;

  const infrastructure = await Infrastructure.create({
    name,
    environment,
    cloudProvider,
    regions: regions || [],
    services: services || [],
    cdn: cdn || { enabled: false },
    monitoring: monitoring || { enabled: true, alerts: [] },
    costTracking: costTracking || {},
    deployedBy: req.user._id,
  });

  res.status(201).json({
    status: 'success',
    data: { infrastructure },
  });
});

/**
 * @desc    Get infrastructure status
 * @route   GET /api/infrastructure/:id/status
 * @access  Private/Admin
 */
exports.getInfrastructureStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const infrastructure = await Infrastructure.findById(id);
  if (!infrastructure) {
    throw new ErrorResponse('Infrastructure not found', 404);
  }

  // Calculate health status
  const healthyServices = infrastructure.services.filter(s => s.status === 'active').length;
  const totalServices = infrastructure.services.length;
  const healthPercentage = totalServices > 0 ? (healthyServices / totalServices) * 100 : 0;

  res.json({
    status: 'success',
    data: {
      infrastructure,
      health: {
        percentage: healthPercentage,
        healthyServices,
        totalServices,
        status: healthPercentage >= 80 ? 'healthy' : healthPercentage >= 50 ? 'degraded' : 'unhealthy',
      },
    },
  });
});

