const express = require('express');
const router = express.Router();
const {
  createDashboard,
  getDashboards,
  updateDashboard,
} = require('../controllers/custom-dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/', createDashboard);
router.get('/', getDashboards);
router.patch('/:id', updateDashboard);

module.exports = router;

