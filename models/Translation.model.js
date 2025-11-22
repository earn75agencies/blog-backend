const mongoose = require('mongoose');

/**
 * Translation Schema
 * For content translations
 */
const translationSchema = new mongoose.Schema(
  {
    content: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['post', 'series', 'course', 'product', 'page', 'media'],
      required: true,
      index: true,
    },
    language: {
      type: String,
      required: true,
      index: true,
    },
    locale: {
      type: String,
      required: true,
    },
    translatedFields: {
      type: Map,
      of: String,
    },
    translator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    translationMethod: {
      type: String,
      enum: ['manual', 'ai', 'hybrid'],
      default: 'manual',
    },
    quality: {
      score: { type: Number, default: 0 },
      reviewed: { type: Boolean, default: false },
      reviewedBy: mongoose.Schema.Types.ObjectId,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'published'],
      default: 'draft',
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
translationSchema.index({ content: 1, contentType: 1, language: 1 }, { unique: true });
translationSchema.index({ language: 1, status: 1 });
translationSchema.index({ locale: 1 });

const Translation = mongoose.model('Translation', translationSchema);

module.exports = Translation;
