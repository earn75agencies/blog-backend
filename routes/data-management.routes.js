const express = require('express');
const router = express.Router();
const {
  exportData,
  getExportHistory,
} = require('../controllers/data-management.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/export', exportData);
router.get('/exports', getExportHistory);

module.exports = router;

