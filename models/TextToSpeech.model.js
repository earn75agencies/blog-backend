const mongoose = require('mongoose');

/**
 * Text to Speech Schema
 * For text-to-speech for posts
 */
const textToSpeechSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    audioUrl: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: 'en',
    },
    voice: {
      type: String,
      enum: ['male', 'female', 'neutral'],
      default: 'neutral',
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
    duration: {
      type: Number, // in seconds
    },
    fileSize: {
      type: Number, // in bytes
    },
    format: {
      type: String,
      enum: ['mp3', 'wav', 'ogg'],
      default: 'mp3',
    },
    plays: {
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
textToSpeechSchema.index({ post: 1 }, { unique: true });
textToSpeechSchema.index({ language: 1, createdAt: -1 });
textToSpeechSchema.index({ plays: -1 });

const TextToSpeech = mongoose.model('TextToSpeech', textToSpeechSchema);

module.exports = TextToSpeech;

