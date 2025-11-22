const mongoose = require('mongoose');

/**
 * Spatial Audio Schema
 * For spatial audio support in VR/AR content
 */
const spatialAudioSchema = new mongoose.Schema(
  {
    content: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['post', 'vr-content', 'stream', 'event'],
      required: true,
    },
    audioUrl: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      enum: ['ambisonic', 'binaural', 'multichannel'],
      default: 'binaural',
    },
    channels: {
      type: Number,
      default: 2,
    },
    sampleRate: {
      type: Number,
      default: 44100,
    },
    spatialSettings: {
      position: {
        x: Number,
        y: Number,
        z: Number,
      },
      orientation: {
        x: Number,
        y: Number,
        z: Number,
      },
      distanceModel: {
        type: String,
        enum: ['linear', 'inverse', 'exponential'],
        default: 'inverse',
      },
      rolloffFactor: {
        type: Number,
        default: 1,
      },
      refDistance: {
        type: Number,
        default: 1,
      },
      maxDistance: {
        type: Number,
        default: 10000,
      },
    },
    isLooping: {
      type: Boolean,
      default: false,
    },
    volume: {
      type: Number,
      default: 1.0,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
spatialAudioSchema.index({ content: 1, contentType: 1 });
spatialAudioSchema.index({ format: 1 });

const SpatialAudio = mongoose.model('SpatialAudio', spatialAudioSchema);

module.exports = SpatialAudio;

