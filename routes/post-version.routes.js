const express = require('express');
const router = express.Router();
const {
  getPostVersions,
  getPostVersion,
  createPostVersion,
  restorePostVersion,
} = require('../controllers/post-version.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/:postId/versions', getPostVersions);
router.get('/:postId/versions/:version', getPostVersion);
router.post('/:postId/versions', createPostVersion);
router.post('/:postId/versions/:version/restore', restorePostVersion);

module.exports = router;

