const express = require('express');
const router = express.Router();
const {
  createVRContent,
  getVRContent,
  add3DModel,
  addSpatialAudio,
} = require('../controllers/vr-content.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/', authenticate, createVRContent);
router.get('/:id', getVRContent);
router.post('/:id/3d-model', authenticate, add3DModel);
router.post('/:id/spatial-audio', authenticate, addSpatialAudio);

module.exports = router;

