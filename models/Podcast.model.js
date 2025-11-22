const mongoose = require('mongoose');

/**
 * Podcast Schema
 * For podcast episodes and series
 */
const podcastSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Series',
    },
    audioUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // in seconds
      required: true,
    },
    transcript: {
      text: String,
      url: String,
      language: String,
    },
    chapters: [
      {
        title: String,
        startTime: Number,
        endTime: Number,
      },
    ],
    highlights: [
      {
        text: String,
        timestamp: Number,
        duration: Number,
      },
    ],
    guests: [
      {
        name: String,
        role: String,
        bio: String,
      },
    ],
    monetization: {
      ads: { type: Boolean, default: false },
      premium: { type: Boolean, default: false },
      sponsors: [
        {
          name: String,
          logo: String,
          link: String,
        },
      ],
    },
    analytics: {
      listens: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      averageListenTime: { type: Number, default: 0 },
    },
    publishedAt: Date,
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
podcastSchema.index({ slug: 1 }, { unique: true });
podcastSchema.index({ creator: 1, createdAt: -1 });
podcastSchema.index({ status: 1, publishedAt: -1 });
podcastSchema.index({ 'analytics.listens': -1 });

const Podcast = mongoose.model('Podcast', podcastSchema);

module.exports = Podcast;
