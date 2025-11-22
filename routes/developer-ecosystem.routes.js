const express = require('express');
const router = express.Router();
const {
  registerDeveloper,
  generateAPIKey,
  getDeveloperDashboard,
  createPlugin,
  getPlugins,
} = require('../controllers/developer-ecosystem.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/register', registerDeveloper);
router.post('/api-keys', generateAPIKey);
router.get('/dashboard', getDeveloperDashboard);
router.post('/plugins', createPlugin);
router.get('/plugins', getPlugins);

module.exports = router;

