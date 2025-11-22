const mongoose = require('mongoose');

/**
 * VR 3D Model Schema
 * For 3D model embedding in posts
 */
const vr3dModelSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    modelUrl: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    format: {
      type: String,
      enum: ['gltf', 'glb', 'obj', 'fbx', 'dae'],
      default: 'gltf',
    },
    size: {
      type: Number, // in bytes
    },
    dimensions: {
      width: Number,
      height: Number,
      depth: Number,
    },
    interactive: {
      type: Boolean,
      default: false,
    },
    animations: [
      {
        name: String,
        duration: Number,
        loop: Boolean,
      },
    ],
    materials: [
      {
        name: String,
        type: String,
        properties: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
      },
    ],
    settings: {
      autoRotate: { type: Boolean, default: false },
      showControls: { type: Boolean, default: true },
      allowZoom: { type: Boolean, default: true },
      allowPan: { type: Boolean, default: true },
      lighting: {
        type: String,
        enum: ['auto', 'bright', 'dim', 'custom'],
        default: 'auto',
      },
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
vr3dModelSchema.index({ author: 1, createdAt: -1 });
vr3dModelSchema.index({ format: 1, isPublic: 1 });
vr3dModelSchema.index({ views: -1 });

const VR3DModel = mongoose.model('VR3DModel', vr3dModelSchema);

module.exports = VR3DModel;

