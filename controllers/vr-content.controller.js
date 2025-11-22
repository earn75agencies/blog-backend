const VRContent = require('../models/VRContent.model');
const VR3DModel = require('../models/VR3DModel.model');
const SpatialAudio = require('../models/SpatialAudio.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Create VR/AR content
 * @route   POST /api/vr-content
 * @access  Private
 */
exports.createVRContent = asyncHandler(async (req, res) => {
  const {
    post,
    type,
    title,
    description,
    media,
    interactiveElements,
    settings,
  } = req.body;

  const vrContent = await VRContent.create({
    post,
    author: req.user._id,
    type,
    title,
    description,
    media,
    interactiveElements: interactiveElements || [],
    settings: settings || {},
  });

  res.status(201).json({
    status: 'success',
    data: { vrContent },
  });
});

/**
 * @desc    Get VR/AR content
 * @route   GET /api/vr-content/:id
 * @access  Public
 */
exports.getVRContent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vrContent = await VRContent.findById(id)
    .populate('author', 'username avatar')
    .populate('post', 'title slug');

  if (!vrContent) {
    throw new ErrorResponse('VR content not found', 404);
  }

  // Increment views
  vrContent.views += 1;
  await vrContent.save();

  res.json({
    status: 'success',
    data: { vrContent },
  });
});

/**
 * @desc    Add 3D model to VR content
 * @route   POST /api/vr-content/:id/3d-model
 * @access  Private
 */
exports.add3DModel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    modelUrl,
    thumbnail,
    format,
    size,
    dimensions,
    interactive,
    animations,
    materials,
    settings,
  } = req.body;

  const vrContent = await VRContent.findById(id);
  if (!vrContent) {
    throw new ErrorResponse('VR content not found', 404);
  }

  // Check permissions
  if (vrContent.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  const model = await VR3DModel.create({
    post: vrContent.post,
    author: req.user._id,
    name,
    modelUrl,
    thumbnail,
    format: format || 'gltf',
    size,
    dimensions,
    interactive: interactive || false,
    animations: animations || [],
    materials: materials || [],
    settings: settings || {},
  });

  res.status(201).json({
    status: 'success',
    data: { model },
  });
});

/**
 * @desc    Add spatial audio to VR content
 * @route   POST /api/vr-content/:id/spatial-audio
 * @access  Private
 */
exports.addSpatialAudio = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    audioUrl,
    format,
    channels,
    sampleRate,
    spatialSettings,
    isLooping,
    volume,
  } = req.body;

  const vrContent = await VRContent.findById(id);
  if (!vrContent) {
    throw new ErrorResponse('VR content not found', 404);
  }

  // Check permissions
  if (vrContent.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  const spatialAudio = await SpatialAudio.create({
    content: id,
    contentType: 'vr-content',
    audioUrl,
    format: format || 'binaural',
    channels: channels || 2,
    sampleRate: sampleRate || 44100,
    spatialSettings: spatialSettings || {},
    isLooping: isLooping || false,
    volume: volume || 1.0,
  });

  res.status(201).json({
    status: 'success',
    data: { spatialAudio },
  });
});

