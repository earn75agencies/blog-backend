const asyncHandler = require('../../../utils/asyncHandler');
const ErrorResponse = require('../../../utils/ErrorResponse');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary.util');

/**
 * Upload image
 */
exports.uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ErrorResponse('No file uploaded', 400);
  }

  const result = await uploadToCloudinary(req.file.buffer, {
    resource_type: 'image',
    folder: 'gidi-blog/images',
  });

  res.status(200).json({
    status: 'success',
    data: {
      url: result.secure_url,
      publicId: result.public_id,
    },
  });
});

/**
 * Upload video
 */
exports.uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ErrorResponse('No file uploaded', 400);
  }

  const result = await uploadToCloudinary(req.file.buffer, {
    resource_type: 'video',
    folder: 'gidi-blog/videos',
  });

  res.status(200).json({
    status: 'success',
    data: {
      url: result.secure_url,
      publicId: result.public_id,
    },
  });
});

/**
 * Delete media
 */
exports.deleteMedia = asyncHandler(async (req, res) => {
  const { deleteFromCloudinary } = require('../utils/cloudinary.util');
  const Media = require('../../../models/Media.model');
  
  const media = await Media.findById(req.params.id);
  
  if (!media) {
    throw new ErrorResponse('Media not found', 404);
  }

  // Check permissions
  if (media.uploader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to delete this media', 403);
  }

  // Delete from Cloudinary
  const publicId = media.cloudinaryPublicId || media.publicId;
  if (publicId) {
    try {
      await deleteFromCloudinary(publicId);
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      // Continue with database deletion even if Cloudinary fails
    }
  }

  // Delete from database
  await Media.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Media deleted successfully',
  });
});

