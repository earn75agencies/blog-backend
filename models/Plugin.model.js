const mongoose = require('mongoose');

/**
 * Plugin Schema
 * For marketplace plugins
 */
const pluginSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    developer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['theme', 'widget', 'analytics', 'content', 'monetization', 'social', 'other'],
      required: true,
    },
    version: {
      type: String,
      required: true,
      default: '1.0.0',
    },
    versions: [
      {
        version: String,
        changelog: String,
        releaseDate: Date,
        downloadUrl: String,
        isActive: Boolean,
      },
    ],
    price: {
      type: Number,
      default: 0,
    },
    isFree: {
      type: Boolean,
      default: true,
    },
    downloads: {
      type: Number,
      default: 0,
    },
    ratings: [
      {
        user: mongoose.Schema.Types.ObjectId,
        rating: { type: Number, min: 1, max: 5 },
        review: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    dependencies: [String],
    permissions: [String],
    screenshots: [String],
    icon: String,
    documentation: String,
    supportUrl: String,
    repository: String,
    tags: [String],
    aiRecommended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
pluginSchema.index({ slug: 1 }, { unique: true });
pluginSchema.index({ category: 1, status: 1 });
pluginSchema.index({ developer: 1, createdAt: -1 });
pluginSchema.index({ downloads: -1 });
pluginSchema.index({ averageRating: -1 });

const Plugin = mongoose.model('Plugin', pluginSchema);

module.exports = Plugin;
