const express = require('express');
const router = express.Router();
const {
  createInfrastructure,
  getInfrastructureStatus,
} = require('../controllers/infrastructure-cloud.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('admin'));

router.post('/', createInfrastructure);
router.get('/:id/status', getInfrastructureStatus);

module.exports = router;

