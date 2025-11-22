const Media = require('../models/Media.model');
const Playlist = require('../models/Playlist.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const { uploadImage, deleteImage } = require('../config/cloudinary.config');

/**
 * @desc    Upload media
 * @route   POST /api/media/upload
 * @access  Private
 */
exports.uploadMedia = asyncHandler(async (req, res) => {
  const { description, alt, tags, folder, category } = req.body;

  if (!req.file) {
    throw new ErrorResponse('No file uploaded', 400);
  }

  // Upload to Cloudinary
  const uploadResult = await uploadImage(req.file.path);

  const media = await Media.create({
    filename: req.file.filename,
    originalFilename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: uploadResult.secure_url,
    cloudinaryPublicId: uploadResult.public_id,
    uploader: req.user._id,
    folder: folder || 'uploads',
    description,
    alt,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
    category: category || 'image',
    width: uploadResult.width,
    height: uploadResult.height,
  });

  res.status(201).json({
    status: 'success',
    data: { media },
  });
});

/**
 * @desc    Get media library
 * @route   GET /api/media
 * @access  Private
 */
exports.getMediaLibrary = asyncHandler(async (req, res) => {
  const {
    category,
    folder,
    tags,
    search,
    format,
    minSize,
    maxSize,
    limit = 50,
    page = 1,
  } = req.query;

  const query = { uploader: req.user._id };
  if (category) query.category = category;
  if (folder) query.folder = folder;
  if (tags) query.tags = { $in: Array.isArray(tags) ? tags : tags.split(',') };
  if (format) query.mimetype = { $regex: format, $options: 'i' };
  if (minSize || maxSize) {
    query.size = {};
    if (minSize) query.size.$gte = parseInt(minSize);
    if (maxSize) query.size.$lte = parseInt(maxSize);
  }
  if (search) {
    query.$or = [
      { filename: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const media = await Media.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Media.countDocuments(query);

  res.json({
    status: 'success',
    data: {
      media,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @desc    Get media usage
 * @route   GET /api/media/:id/usage
 * @access  Private
 */
exports.getMediaUsage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const media = await Media.findById(id);
  if (!media) {
    throw new ErrorResponse('Media not found', 404);
  }

  // Check permissions
  if (media.uploader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  res.json({
    status: 'success',
    data: {
      usage: {
        count: media.usageCount,
        usedIn: media.usedIn,
        analytics: media.analytics,
      },
    },
  });
});

/**
 * @desc    Create playlist
 * @route   POST /api/media/playlists
 * @access  Private
 */
exports.createPlaylist = asyncHandler(async (req, res) => {
  const { name, description, items, isSmart, smartRules, isPublic } = req.body;

  const playlist = await Playlist.create({
    name,
    description,
    creator: req.user._id,
    items: items || [],
    isSmart: isSmart || false,
    smartRules: smartRules || {},
    isPublic: isPublic !== undefined ? isPublic : true,
  });

  res.status(201).json({
    status: 'success',
    data: { playlist },
  });
});

/**
 * @desc    Get playlists
 * @route   GET /api/media/playlists
 * @access  Public
 */
exports.getPlaylists = asyncHandler(async (req, res) => {
  const { creator, isPublic } = req.query;

  const query = {};
  if (creator) query.creator = creator;
  if (isPublic !== undefined) query.isPublic = isPublic === 'true';

  const playlists = await Playlist.find(query)
    .populate('creator', 'username avatar')
    .populate('items.media', 'url thumbnail')
    .sort({ createdAt: -1 });

  res.json({
    status: 'success',
    data: { playlists },
  });
});

/**
 * @desc    Bulk upload media
 * @route   POST /api/media/bulk-upload
 * @access  Private
 */
exports.bulkUploadMedia = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ErrorResponse('No files uploaded', 400);
  }

  const { folder, tags } = req.body;
  const uploadedMedia = [];

  for (const file of req.files) {
    try {
      const uploadResult = await uploadImage(file.path);
      const media = await Media.create({
        filename: file.filename,
        originalFilename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        uploader: req.user._id,
        folder: folder || 'uploads',
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
        category: file.mimetype.startsWith('image') ? 'image' : 
                  file.mimetype.startsWith('video') ? 'video' : 
                  file.mimetype.startsWith('audio') ? 'audio' : 'other',
      });
      uploadedMedia.push(media);
    } catch (error) {
      console.error(`Error uploading ${file.originalname}:`, error);
    }
  }

  res.status(201).json({
    status: 'success',
    message: `${uploadedMedia.length} files uploaded successfully`,
    data: { media: uploadedMedia },
  });
});

