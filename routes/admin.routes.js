const express = require('express');
const {
  getOverview,
  getAllUsers,
  updateUserRole,
  getAllPosts,
  approveComment,
  rejectComment,
  getSettings,
  updateSettings,
} = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require admin access
router.use(authenticate);
router.use(authorize('admin'));

router.get('/overview', getOverview);
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.get('/posts', getAllPosts);
router.put('/comments/:id/approve', approveComment);
router.put('/comments/:id/reject', rejectComment);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;

