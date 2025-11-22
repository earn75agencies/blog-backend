const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  getUserProfile,
  updateUser,
  deleteUser,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
  getUserPosts,
} = require('../../../controllers/user.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');

// Public routes
router.get('/', getUsers);
router.get('/profile/:username', getUserProfile);

// Protected routes
router.use(authenticate);

router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', authorize('admin'), deleteUser);
router.post('/:id/follow', followUser);
router.post('/:id/unfollow', unfollowUser);
router.get('/:id/followers', getUserFollowers);
router.get('/:id/following', getUserFollowing);
router.get('/:id/posts', getUserPosts);

module.exports = router;

