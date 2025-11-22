const express = require('express');
const router = express.Router();
const { protect } = require('../../../middleware/auth.middleware');
const { uploadImage, uploadVideo, deleteMedia } = require('../controllers/upload.controller');

router.post('/image', protect, uploadImage);
router.post('/video', protect, uploadVideo);
router.delete('/:id', protect, deleteMedia);

module.exports = router;

