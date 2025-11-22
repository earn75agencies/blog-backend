const express = require('express');
const {
  createWebhook,
  getWebhooks,
  updateWebhook,
  deleteWebhook,
} = require('../controllers/webhook.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getWebhooks);
router.post('/', createWebhook);
router.put('/:id', updateWebhook);
router.delete('/:id', deleteWebhook);

module.exports = router;

