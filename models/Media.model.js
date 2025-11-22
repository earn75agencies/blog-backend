const mongoose = require('mongoose');

/**
 * Media Library Schema
 * For managing uploaded media files
 */
const mediaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
    },
    originalFilename: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    cloudinaryPublicId: {
      type: String,
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    folder: {
      type: String,
      default: 'uploads',
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    alt: {
      type: String,
      maxlength: [200, 'Alt text cannot exceed 200 characters'],
    },
    tags: [String],
    category: {
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'other'],
      default: 'image',
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    duration: {
      type: Number, // for video/audio in seconds
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    usedIn: [
      {
        type: {
          type: String,
          enum: ['post', 'series', 'course', 'user', 'category', 'other'],
        },
        id: {
          type: mongoose.Schema.Types.ObjectId,
        },
      },
    ],
    // Enhanced features
    folders: [String],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    // AI features
    aiTags: [String],
    aiDescription: String,
    aiClassification: String,
    // Compression & optimization
    optimized: {
      originalSize: Number,
      optimizedSize: Number,
      compressionRatio: Number,
      formats: [
        {
          format: String,
          url: String,
          size: Number,
        },
      ],
    },
    // Version control
    versions: [
      {
        version: Number,
        url: String,
        size: Number,
        createdAt: Date,
      },
    ],
    currentVersion: {
      type: Number,
      default: 1,
    },
    // Thumbnails
    thumbnails: [
      {
        size: String, // 'small', 'medium', 'large'
        url: String,
        width: Number,
        height: Number,
      },
    ],
    // Video/Audio specific
    video: {
      duration: Number,
      bitrate: Number,
      resolution: {
        width: Number,
        height: Number,
      },
      captions: [
        {
          language: String,
          url: String,
        },
      ],
      transcripts: [
        {
          language: String,
          text: String,
        },
      ],
    },
    audio: {
      duration: Number,
      waveform: String,
      chapters: [
        {
          title: String,
          startTime: Number,
          endTime: Number,
        },
      ],
    },
    // VR/AR
    vrContent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VRContent',
    },
    arModel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VR3DModel',
    },
    // Rights & licensing
    license: {
      type: String,
      enum: ['all-rights-reserved', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'public-domain', 'custom'],
      default: 'all-rights-reserved',
    },
    rightsHolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Privacy
    privacy: {
      type: String,
      enum: ['public', 'private', 'restricted'],
      default: 'public',
    },
    allowedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Watermarking
    watermark: {
      enabled: { type: Boolean, default: false },
      position: {
        type: String,
        enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
      },
      image: String,
    },
    // Color palette
    colorPalette: [
      {
        color: String,
        percentage: Number,
      },
    ],
    // CDN
    cdnUrl: String,
    cdnEnabled: {
      type: Boolean,
      default: false,
    },
    // Content hash for deduplication (SHA-256)
    contentHash: {
      type: String,
      index: true, // Critical for deduplication lookups
      sparse: true, // Allow null values but index non-null
    },
    // Storage location (S3/Cloudinary/etc)
    storageProvider: {
      type: String,
      enum: ['local', 's3', 'cloudinary', 'cloudflare', 'gcs', 'azure'],
      default: 'cloudinary',
    },
    storageKey: {
      type: String, // S3 key, Cloudinary public_id, etc.
      index: true,
    },
    // Duplicate detection
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
    },
    duplicates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    // Approval workflow
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Analytics
    analytics: {
      views: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
    },
    // Playlists
    playlists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist',
      },
    ],
    // Scheduled publishing
    scheduledPublish: Date,
    // Localization
    metadataTranslations: [
      {
        language: String,
        title: String,
        description: String,
        alt: String,
      },
    ],
    // Accessibility
    accessibility: {
      altText: String,
      captions: { type: Boolean, default: false },
      transcripts: { type: Boolean, default: false },
      screenReader: { type: Boolean, default: false },
      score: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Critical indexes for unlimited scalability
mediaSchema.index({ uploader: 1, createdAt: -1 });
mediaSchema.index({ category: 1, createdAt: -1 });
mediaSchema.index({ folder: 1, createdAt: -1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ mimetype: 1 });
mediaSchema.index({ createdAt: -1 });
mediaSchema.index({ usageCount: -1 });
mediaSchema.index({ filename: 1 });
mediaSchema.index({ cloudinaryPublicId: 1 });
mediaSchema.index({ contentHash: 1 }, { unique: true, sparse: true }); // Deduplication
mediaSchema.index({ storageProvider: 1, storageKey: 1 }); // Storage lookup
mediaSchema.index({ cdnUrl: 1 }); // CDN lookup

// Method to increment usage count
mediaSchema.methods.incrementUsage = async function (type, id) {
  this.usageCount += 1;
  if (type && id) {
    const existingUsage = this.usedIn.find(
      (u) => u.type === type && u.id.toString() === id.toString()
    );
    if (!existingUsage) {
      this.usedIn.push({ type, id });
    }
  }
  await this.save();
  return this;
};

// Method to decrement usage count
mediaSchema.methods.decrementUsage = async function (type, id) {
  if (this.usageCount > 0) {
    this.usageCount -= 1;
  }
  if (type && id) {
    this.usedIn = this.usedIn.filter(
      (u) => !(u.type === type && u.id.toString() === id.toString())
    );
  }
  await this.save();
  return this;
};

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;

