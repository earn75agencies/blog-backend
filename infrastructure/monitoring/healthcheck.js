const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    checks: {
      database: 'unknown',
      memory: process.memoryUsage(),
    },
  };

  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      healthcheck.checks.database = 'connected';
    } else {
      healthcheck.checks.database = 'disconnected';
      healthcheck.message = 'Database disconnected';
      return res.status(503).json(healthcheck);
    }

    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = 'ERROR';
    healthcheck.error = error.message;
    res.status(503).json(healthcheck);
  }
});

module.exports = router;

