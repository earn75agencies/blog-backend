const express = require('express');
const router = express.Router();
const {
  createScheduledPost,
  getScheduledPosts,
  updateScheduledPost,
  cancelScheduledPost,
} = require('../controllers/scheduled-post.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/schedule', createScheduledPost);
router.get('/scheduled', getScheduledPosts);
router.patch('/scheduled/:id', updateScheduledPost);
router.delete('/scheduled/:id', cancelScheduledPost);

module.exports = router;

