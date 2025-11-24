const User = require('../models/User.model');

/**
 * Admin middleware
 * Checks if user has admin role
 */
const admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized to access this route',
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to access this route. Admin access required.',
    });
  }

  next();
};

/**
 * Super Admin middleware
 * Checks if user has super admin role
 */
const superAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized to access this route',
    });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to access this route. Super admin access required.',
    });
  }

  next();
};

module.exports = {
  admin,
  superAdmin,
};