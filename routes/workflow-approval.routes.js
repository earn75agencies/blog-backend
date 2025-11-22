const express = require('express');
const router = express.Router();
const {
  createWorkflow,
  submitForApproval,
  approveContent,
  requestChanges,
  getApproval,
} = require('../controllers/workflow-approval.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.post('/', authenticate, authorize('admin'), createWorkflow);
router.post('/:workflowId/submit', authenticate, submitForApproval);
router.post('/approvals/:id/approve', authenticate, approveContent);
router.post('/approvals/:id/request-changes', authenticate, requestChanges);
router.get('/approvals/:id', authenticate, getApproval);

module.exports = router;

