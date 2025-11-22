const mongoose = require('mongoose');

/**
 * VR/AR Content Schema
 * For immersive 360° and VR blog content
 */
const vrContentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['360', 'vr', 'ar', 'mixed-reality'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    media: {
      video360: String,
      vrModel: String,
      arModel: String,
      thumbnail: String,
    },
    interactiveElements: [
      {
        type: {
          type: String,
          enum: ['hotspot', '3d-model', 'video', 'audio', 'text', 'link'],
        },
        position: {
          x: Number,
          y: Number,
          z: Number,
        },
        rotation: {
          x: Number,
          y: Number,
          z: Number,
        },
        content: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
      },
    ],
    settings: {
      allowNavigation: { type: Boolean, default: true },
      autoRotate: { type: Boolean, default: false },
      showControls: { type: Boolean, default: true },
      quality: {
        type: String,
        enum: ['low', 'medium', 'high', 'ultra'],
        default: 'medium',
      },
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
vrContentSchema.index({ author: 1, createdAt: -1 });
vrContentSchema.index({ type: 1, isPublished: 1 });
vrContentSchema.index({ isPublished: 1, publishedAt: -1 });
vrContentSchema.index({ views: -1 });

const VRContent = mongoose.model('VRContent', vrContentSchema);

module.exports = VRContent;

