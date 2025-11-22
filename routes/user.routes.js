const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
  getUserPosts,
  getUserProfile,
} = require('../controllers/user.controller');
const {
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
  getBlockedUsers,
  getMutedUsers,
} = require('../controllers/user-block.controller');
const {
  exportUserData,
  exportPosts,
  exportComments,
} = require('../controllers/data-export.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { updateUserValidation } = require('../validators/user.validator');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getUsers);
router.get('/profile/:username', optionalAuth, getUserProfile);
router.get('/:id', optionalAuth, getUser);
router.get('/:id/followers', optionalAuth, getUserFollowers);
router.get('/:id/following', optionalAuth, getUserFollowing);
router.get('/:id/posts', optionalAuth, getUserPosts);

// Protected routes
router.put('/:id', authenticate, updateUserValidation, validate, updateUser);
router.delete('/:id', authenticate, authorize('admin'), deleteUser);
router.post('/:id/follow', authenticate, followUser);
router.post('/:id/unfollow', authenticate, unfollowUser);
router.post('/:id/block', authenticate, blockUser);
router.post('/:id/unblock', authenticate, unblockUser);
router.post('/:id/mute', authenticate, muteUser);
router.post('/:id/unmute', authenticate, unmuteUser);
router.get('/me/blocked', authenticate, getBlockedUsers);
router.get('/me/muted', authenticate, getMutedUsers);
router.get('/me/export', authenticate, exportUserData);
router.get('/me/export/posts', authenticate, exportPosts);
router.get('/me/export/comments', authenticate, exportComments);

module.exports = router;

