const express = require('express');
const router = express.Router();
const {
  createReport,
  generateReport,
  getReports,
  getDashboard,
} = require('../controllers/analytics-reporting.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/reports', createReport);
router.post('/reports/:id/generate', generateReport);
router.get('/reports', getReports);
router.get('/dashboard', getDashboard);

module.exports = router;

