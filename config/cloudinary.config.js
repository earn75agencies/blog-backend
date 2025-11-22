const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

/**
 * Cloudinary configuration for image uploads
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret',
});

/**
 * Multer upload configuration - uploads to local temp folder
 */
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|gif|webp/;
    const ext = allowed.test(file.mimetype);
    if (ext) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Local file path (from multer)
 * @param {Object} options - Additional Cloudinary upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadImage = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'gidi-blog',
      transformation: [
        { width: 1200, height: 800, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      ...options,
    });

    // Clean up local temp file after upload
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to delete temp file:', filePath, error.message);
    }

    return result;
  } catch (error) {
    // Clean up local temp file even on error
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.warn('Failed to delete temp file on error:', filePath, unlinkError.message);
    }
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID or URL
 * @returns {Promise<Object>} Cloudinary deletion result
 */
const deleteImage = async (publicId) => {
  try {
    // Extract public_id from URL if full URL is provided
    let actualPublicId = publicId;
    if (publicId.includes('cloudinary.com')) {
      // Extract public_id from Cloudinary URL
      const urlParts = publicId.split('/');
      const uploadIndex = urlParts.findIndex((part) => part === 'upload');
      if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
        // Get folder and filename parts after 'upload'
        const folderParts = urlParts.slice(uploadIndex + 2, -1); // Skip version number
        const filename = urlParts[urlParts.length - 1].split('.')[0]; // Remove extension
        actualPublicId = folderParts.length > 0 
          ? `${folderParts.join('/')}/${filename}` 
          : filename;
      }
    }

    const result = await cloudinary.uploader.destroy(actualPublicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  upload,
  uploadImage,
  deleteImage,
};
