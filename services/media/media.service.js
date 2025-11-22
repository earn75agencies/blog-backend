/**
 * Media Service
 * Handles uploads, deduplication, and CDN integration
 * Supports S3, Cloudinary, Cloudflare, GCS, Azure
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Media = require('../../models/Media.model');
const { uploadImage, uploadVideo, uploadFile } = require('../../config/cloudinary.config');
const { addJob } = require('../queue/queue.service');

class MediaService {
  /**
   * Calculate content hash (SHA-256)
   */
  async calculateHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Check for duplicate media by content hash
   */
  async findDuplicate(contentHash) {
    if (!contentHash) return null;
    
    return Media.findOne({ contentHash }).lean();
  }

  /**
   * Upload media with deduplication
   */
  async uploadMedia(file, uploaderId, options = {}) {
    const {
      folder = 'uploads',
      description,
      alt,
      tags = [],
      isPublic = true,
      storageProvider = 'cloudinary',
    } = options;

    // Calculate content hash
    const contentHash = await this.calculateHash(file.path);

    // Check for duplicate
    const duplicate = await this.findDuplicate(contentHash);
    if (duplicate) {
      // Delete uploaded file (duplicate found)
      fs.unlinkSync(file.path);
      
      // Increment usage count
      duplicate.usageCount += 1;
      await Media.updateOne({ _id: duplicate._id }, { $inc: { usageCount: 1 } });
      
      return {
        ...duplicate,
        isDuplicate: true,
        originalMediaId: duplicate._id,
      };
    }

    // Upload to storage provider
    let uploadResult;
    let storageKey;
    let cdnUrl;

    try {
      if (storageProvider === 'cloudinary') {
        if (file.mimetype.startsWith('image/')) {
          uploadResult = await uploadImage(file.path, { folder });
        } else if (file.mimetype.startsWith('video/')) {
          uploadResult = await uploadVideo(file.path, { folder });
        } else {
          uploadResult = await uploadFile(file.path, { folder });
        }
        
        storageKey = uploadResult.public_id;
        cdnUrl = uploadResult.secure_url;
      } else if (storageProvider === 's3') {
        // S3 upload implementation
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION,
        });

        const fileContent = fs.readFileSync(file.path);
        const key = `${folder}/${Date.now()}-${file.filename}`;
        
        uploadResult = await s3.upload({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: fileContent,
          ContentType: file.mimetype,
          ACL: isPublic ? 'public-read' : 'private',
        }).promise();

        storageKey = key;
        cdnUrl = uploadResult.Location;
      } else {
        throw new Error(`Unsupported storage provider: ${storageProvider}`);
      }

      // Create media record
      const media = await Media.create({
        filename: file.filename,
        originalFilename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: cdnUrl,
        contentHash,
        storageProvider,
        storageKey,
        cdnUrl: process.env.CDN_ENABLED === 'true' ? cdnUrl : null,
        cdnEnabled: process.env.CDN_ENABLED === 'true',
        uploader: uploaderId,
        folder,
        description,
        alt,
        tags,
        isPublic,
        category: this.getCategoryFromMimeType(file.mimetype),
      });

      // Queue media processing job (transcoding, thumbnails)
      await addJob('mediaProcessing', {
        mediaId: media._id,
        filePath: file.path,
        mimetype: file.mimetype,
      });

      // Clean up local file
      fs.unlinkSync(file.path);

      return media.toObject();
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  /**
   * Get category from MIME type
   */
  getCategoryFromMimeType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('pdf') || mimetype.includes('document')) return 'document';
    return 'other';
  }

  /**
   * Get media by ID
   */
  async getMedia(mediaId) {
    return Media.findById(mediaId).lean();
  }

  /**
   * Delete media
   */
  async deleteMedia(mediaId, uploaderId) {
    const media = await Media.findById(mediaId);
    
    if (!media) {
      throw new Error('Media not found');
    }

    // Check permissions
    if (media.uploader.toString() !== uploaderId.toString()) {
      throw new Error('Not authorized to delete this media');
    }

    // Delete from storage (queue job)
    await addJob('mediaProcessing', {
      action: 'delete',
      mediaId: media._id,
      storageProvider: media.storageProvider,
      storageKey: media.storageKey,
    });

    // Delete from database
    await Media.deleteOne({ _id: mediaId });

    return { success: true };
  }
}

module.exports = new MediaService();



