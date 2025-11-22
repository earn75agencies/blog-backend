const express = require('express');
const router = express.Router();
const {
  getMedia,
  getSingleMedia,
  uploadMedia,
  updateMedia,
  deleteMedia,
  getFolders,
  bulkDeleteMedia,
} = require('../../../controllers/media.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const { upload } = require('../../../config/cloudinary.config');

// All routes require authentication
router.use(authenticate);

// Get media library
router.get('/', getMedia);
router.get('/folders', getFolders);
router.get('/:id', getSingleMedia);

// Upload media
router.post('/', authorize('author', 'admin'), upload.single('file'), uploadMedia);

// Update media
router.put('/:id', authorize('author', 'admin'), updateMedia);

// Delete media
router.delete('/:id', authorize('author', 'admin'), deleteMedia);
router.post('/bulk/delete', authorize('author', 'admin'), bulkDeleteMedia);

module.exports = router;

