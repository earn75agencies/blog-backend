const mongoose = require('mongoose');

/**
 * Ad Schema
 * For multi-channel ad network
 */
const adSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    advertiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['banner', 'native', 'video', 'sponsored', 'popup', 'sidebar'],
      required: true,
      index: true,
    },
    content: {
      image: String,
      video: String,
      text: String,
      link: {
        type: String,
        required: true,
      },
    },
    targeting: {
      categories: [String],
      tags: [String],
      regions: [String],
      languages: [String],
      devices: [String],
      demographics: {
        ageRange: {
          min: Number,
          max: Number,
        },
        gender: [String],
        interests: [String],
      },
    },
    pricing: {
      model: {
        type: String,
        enum: ['cpc', 'cpm', 'cpa', 'flat'],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    budget: {
      total: Number,
      daily: Number,
      spent: { type: Number, default: 0 },
    },
    schedule: {
      startDate: Date,
      endDate: Date,
      timeSlots: [
        {
          day: Number, // 0-6 (Sunday-Saturday)
          hours: [Number], // 0-23
        },
      ],
    },
    stats: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      cpc: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'active', 'paused', 'completed', 'rejected'],
      default: 'draft',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
adSchema.index({ advertiser: 1, createdAt: -1 });
adSchema.index({ type: 1, status: 1, isActive: 1 });
adSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
adSchema.index({ 'stats.clicks': -1 });
adSchema.index({ 'stats.impressions': -1 });

const Ad = mongoose.model('Ad', adSchema);

module.exports = Ad;
