const express = require('express');
const router = express.Router();
const {
  runAccessibilityAudit,
  getAccessibilityAudit,
  markIssueFixed,
} = require('../controllers/accessibility.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/posts/:postId/accessibility/audit', runAccessibilityAudit);
router.get('/posts/:postId/accessibility', getAccessibilityAudit);
router.patch('/posts/:postId/accessibility/issues/:issueId', markIssueFixed);

module.exports = router;

