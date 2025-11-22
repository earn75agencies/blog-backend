const express = require('express');
const {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  approveJoinRequest,
} = require('../controllers/group.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getGroups);
router.get('/:slug', optionalAuth, getGroup);

// Protected routes
router.post('/', authenticate, createGroup);
router.put('/:id', authenticate, updateGroup);
router.delete('/:id', authenticate, deleteGroup);
router.post('/:id/join', authenticate, joinGroup);
router.post('/:id/leave', authenticate, leaveGroup);
router.post('/:id/approve/:userId', authenticate, approveJoinRequest);

module.exports = router;

