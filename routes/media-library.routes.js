const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  uploadMedia,
  getMediaLibrary,
  getMediaUsage,
  createPlaylist,
  getPlaylists,
  bulkUploadMedia,
} = require('../controllers/media-library.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/upload', upload.single('file'), uploadMedia);
router.post('/bulk-upload', upload.array('files', 20), bulkUploadMedia);
router.get('/', getMediaLibrary);
router.get('/:id/usage', getMediaUsage);
router.post('/playlists', createPlaylist);
router.get('/playlists', getPlaylists);

module.exports = router;

