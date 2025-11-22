const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReport,
  updateReport,
  getMyReports,
} = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Protected routes
router.post('/', authenticate, createReport);
router.get('/me', authenticate, getMyReports);

// Admin routes
router.get('/', authenticate, authorize('admin'), getReports);
router.get('/:id', authenticate, authorize('admin'), getReport);
router.patch('/:id', authenticate, authorize('admin'), updateReport);

module.exports = router;

