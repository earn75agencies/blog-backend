const mongoose = require('mongoose');

/**
 * Personalization Schema
 * For user personalization preferences
 */
const personalizationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    preferences: {
      language: { type: String, default: 'en' },
      timezone: String,
      currency: { type: String, default: 'USD' },
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      layout: { type: String, enum: ['compact', 'comfortable', 'spacious'], default: 'comfortable' },
      rtl: { type: Boolean, default: false },
    },
    interests: [String],
    favoriteCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    favoriteAuthors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    blockedContent: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    readingHabits: {
      preferredReadingTime: String,
      averageReadingTime: Number,
      favoriteTopics: [String],
      readingStreak: { type: Number, default: 0 },
    },
    recommendations: {
      enabled: { type: Boolean, default: true },
      frequency: { type: String, enum: ['realtime', 'daily', 'weekly'], default: 'daily' },
      sources: [String],
    },
    dashboard: {
      widgets: [
        {
          type: String,
          position: Number,
          config: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
          },
        },
      ],
      layout: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
      },
    },
    aiProfile: {
      engagementPattern: {
        type: Map,
        of: Number,
      },
      contentPreferences: {
        type: Map,
        of: Number,
      },
      predictedInterests: [String],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
personalizationSchema.index({ user: 1 }, { unique: true });
personalizationSchema.index({ 'preferences.language': 1 });

const Personalization = mongoose.model('Personalization', personalizationSchema);

module.exports = Personalization;

