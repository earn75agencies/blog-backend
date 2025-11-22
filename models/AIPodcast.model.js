const mongoose = require('mongoose');

/**
 * AI Podcast Generation Schema
 * For AI-generated podcasts from posts
 */
const aiPodcastSchema = new mongoose.Schema(
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
    audioUrl: {
      type: String,
    },
    duration: {
      type: Number, // in seconds
    },
    fileSize: {
      type: Number, // in bytes
    },
    settings: {
      voice: {
        type: String,
        enum: ['male', 'female', 'neutral', 'author'],
        default: 'neutral',
      },
      language: {
        type: String,
        default: 'en',
      },
      speed: {
        type: Number,
        default: 1.0,
        min: 0.5,
        max: 2.0,
      },
      pitch: {
        type: Number,
        default: 1.0,
        min: 0.5,
        max: 2.0,
      },
      backgroundMusic: {
        enabled: { type: Boolean, default: false },
        volume: { type: Number, default: 0.3, min: 0, max: 1 },
      },
    },
    transcript: {
      type: String,
    },
    chapters: [
      {
        title: String,
        startTime: Number, // in seconds
        endTime: Number,
      },
    ],
    processingData: {
      startedAt: Date,
      completedAt: Date,
      processingTime: Number,
      error: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
aiPodcastSchema.index({ post: 1 }, { unique: true });
aiPodcastSchema.index({ author: 1, createdAt: -1 });
aiPodcastSchema.index({ status: 1, createdAt: -1 });

const AIPodcast = mongoose.model('AIPodcast', aiPodcastSchema);

module.exports = AIPodcast;

