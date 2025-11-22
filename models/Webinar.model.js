const mongoose = require('mongoose');

/**
 * Webinar Schema
 * For live webinars with multi-host support
 */
const webinarSchema = new mongoose.Schema(
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
    hosts: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['host', 'co-host', 'moderator'],
          default: 'host',
        },
      },
    ],
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number, // in minutes
      default: 60,
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    streamUrl: {
      type: String,
    },
    recordingUrl: {
      type: String,
    },
    attendees: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        joinedAt: Date,
        leftAt: Date,
        duration: Number, // in minutes
      },
    ],
    attendeesCount: {
      type: Number,
      default: 0,
    },
    maxAttendees: {
      type: Number,
    },
    features: {
      multiCamera: { type: Boolean, default: false },
      polls: { type: Boolean, default: true },
      qa: { type: Boolean, default: true },
      chat: { type: Boolean, default: true },
      recording: { type: Boolean, default: true },
      captions: { type: Boolean, default: false },
      translations: { type: Boolean, default: false },
    },
    polls: [
      {
        question: String,
        options: [String],
        votes: [
          {
            user: mongoose.Schema.Types.ObjectId,
            option: Number,
            votedAt: Date,
          },
        ],
        createdAt: Date,
      },
    ],
    questions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        question: String,
        answered: { type: Boolean, default: false },
        answeredBy: mongoose.Schema.Types.ObjectId,
        answer: String,
        createdAt: Date,
      },
    ],
    analytics: {
      peakViewers: { type: Number, default: 0 },
      averageViewers: { type: Number, default: 0 },
      totalWatchTime: { type: Number, default: 0 },
      engagementScore: { type: Number, default: 0 },
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    requiresRegistration: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
webinarSchema.index({ scheduledAt: 1, status: 1 });
webinarSchema.index({ status: 1, scheduledAt: 1 });
webinarSchema.index({ 'hosts.user': 1 });
webinarSchema.index({ attendeesCount: -1 });
webinarSchema.index({ createdAt: -1 });

const Webinar = mongoose.model('Webinar', webinarSchema);

module.exports = Webinar;

