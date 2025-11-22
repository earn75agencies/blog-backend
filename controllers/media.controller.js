const Media = require('../models/Media.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const { upload, uploadImage, deleteImage } = require('../config/cloudinary.config');

/**
 * @desc    Get all media
 * @route   GET /api/media
 * @access  Private/Author
 */
exports.getMedia = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const query = { uploader: req.user._id };

  if (req.query.category) {
    query.category = req.query.category;
  }
  if (req.query.folder) {
    query.folder = req.query.folder;
  }
  if (req.query.search) {
    query.$or = [
      { filename: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } },
      { alt: { $regex: req.query.search, $options: 'i' } },
      { tags: { $in: [new RegExp(req.query.search, 'i')] } },
    ];
  }
  if (req.query.type) {
    query.mimetype = { $regex: req.query.type, $options: 'i' };
  }

  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

  const media = await Media.find(query)
    .populate('uploader', 'username avatar firstName lastName')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });

  const total = await Media.countDocuments(query);

  res.json({
    status: 'success',
    results: media.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      media,
    },
  });
});

/**
 * @desc    Get single media
 * @route   GET /api/media/:id
 * @access  Private/Author
 */
exports.getSingleMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id).populate('uploader', 'username avatar firstName lastName');

  if (!media) {
    throw new ErrorResponse('Media not found', 404);
  }

  if (media.uploader._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to view this media', 403);
  }

  res.json({
    status: 'success',
    data: {
      media,
    },
  });
});

/**
 * @desc    Upload media
 * @route   POST /api/media
 * @access  Private/Author
 */
exports.uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ErrorResponse('No file uploaded', 400);
  }

  try {
    // Upload to Cloudinary
    const uploadedResult = await uploadImage(req.file.path);

    // Determine category based on mimetype
    let category = 'other';
    if (req.file.mimetype.startsWith('image/')) {
      category = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      category = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      category = 'audio';
    } else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document') || req.file.mimetype.includes('text')) {
      category = 'document';
    }

    const media = await Media.create({
      filename: uploadedResult.public_id.split('/').pop(),
      originalFilename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: uploadedResult.secure_url,
      thumbnail: uploadedResult.eager ? uploadedResult.eager[0]?.secure_url : uploadedResult.secure_url,
      cloudinaryPublicId: uploadedResult.public_id,
      uploader: req.user._id,
      folder: req.body.folder || 'uploads',
      description: req.body.description,
      alt: req.body.alt,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',')) : [],
      category,
      width: uploadedResult.width,
      height: uploadedResult.height,
      duration: uploadedResult.duration,
      metadata: uploadedResult,
    });

    res.status(201).json({
      status: 'success',
      message: 'Media uploaded successfully',
      data: {
        media,
      },
    });
  } catch (error) {
    throw new ErrorResponse(`Failed to upload media: ${error.message}`, 500);
  }
});

/**
 * @desc    Update media
 * @route   PUT /api/media/:id
 * @access  Private/Author
 */
exports.updateMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) {
    throw new ErrorResponse('Media not found', 404);
  }

  if (media.uploader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this media', 403);
  }

  const { description, alt, tags, folder } = req.body;

  if (description !== undefined) media.description = description;
  if (alt !== undefined) media.alt = alt;
  if (tags) media.tags = Array.isArray(tags) ? tags : tags.split(',');
  if (folder) media.folder = folder;

  await media.save();

  res.json({
    status: 'success',
    message: 'Media updated successfully',
    data: {
      media,
    },
  });
});

/**
 * @desc    Delete media
 * @route   DELETE /api/media/:id
 * @access  Private/Author
 */
exports.deleteMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) {
    throw new ErrorResponse('Media not found', 404);
  }

  if (media.uploader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to delete this media', 403);
  }

  // Delete from Cloudinary
  if (media.cloudinaryPublicId) {
    try {
      await deleteImage(media.cloudinaryPublicId);
    } catch (error) {
      console.warn('Failed to delete media from Cloudinary:', error.message);
    }
  }

  await media.remove();

  res.json({
    status: 'success',
    message: 'Media deleted successfully',
  });
});

/**
 * @desc    Get media folders
 * @route   GET /api/media/folders
 * @access  Private/Author
 */
exports.getFolders = asyncHandler(async (req, res) => {
  const folders = await Media.distinct('folder', { uploader: req.user._id });

  const folderStats = await Promise.all(
    folders.map(async (folder) => {
      const count = await Media.countDocuments({
        uploader: req.user._id,
        folder,
      });
      return { folder, count };
    })
  );

  res.json({
    status: 'success',
    data: {
      folders: folderStats,
    },
  });
});

/**
 * @desc    Bulk delete media
 * @route   POST /api/media/bulk/delete
 * @access  Private/Author
 */
exports.bulkDeleteMedia = asyncHandler(async (req, res) => {
  const { mediaIds } = req.body;

  if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
    throw new ErrorResponse('Media IDs array is required', 400);
  }

  const media = await Media.find({
    _id: { $in: mediaIds },
    uploader: req.user._id,
  });

  // Delete from Cloudinary
  for (const item of media) {
    if (item.cloudinaryPublicId) {
      try {
        await deleteImage(item.cloudinaryPublicId);
      } catch (error) {
        console.warn(`Failed to delete media ${item._id} from Cloudinary:`, error.message);
      }
    }
  }

  await Media.deleteMany({
    _id: { $in: mediaIds },
    uploader: req.user._id,
  });

  res.json({
    status: 'success',
    message: `${media.length} media file(s) deleted successfully`,
    data: {
      deletedCount: media.length,
    },
  });
});

