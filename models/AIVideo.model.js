const mongoose = require('mongoose');

/**
 * AI Video Generation Schema
 * For AI-generated videos from blog posts
 */
const aiVideoSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    videoUrl: {
      type: String,
    },
    thumbnail: {
      type: String,
    },
    duration: {
      type: Number, // in seconds
    },
    format: {
      type: String,
      enum: ['mp4', 'webm', 'mov'],
      default: 'mp4',
    },
    resolution: {
      width: Number,
      height: Number,
    },
    settings: {
      style: {
        type: String,
        enum: ['minimal', 'dynamic', 'cinematic', 'animated', 'documentary'],
        default: 'dynamic',
      },
      voiceover: {
        enabled: { type: Boolean, default: true },
        voice: {
          type: String,
          enum: ['male', 'female', 'neutral'],
          default: 'neutral',
        },
        language: {
          type: String,
          default: 'en',
        },
      },
      music: {
        enabled: { type: Boolean, default: true },
        genre: String,
      },
      subtitles: {
        enabled: { type: Boolean, default: true },
        language: String,
      },
    },
    processingData: {
      startedAt: Date,
      completedAt: Date,
      processingTime: Number, // in seconds
      error: String,
    },
    analytics: {
      views: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
aiVideoSchema.index({ post: 1 }, { unique: true });
aiVideoSchema.index({ author: 1, createdAt: -1 });
aiVideoSchema.index({ status: 1, createdAt: -1 });
aiVideoSchema.index({ createdAt: -1 });

const AIVideo = mongoose.model('AIVideo', aiVideoSchema);

module.exports = AIVideo;

