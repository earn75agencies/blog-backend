const mongoose = require('mongoose');

/**
 * Event Schema
 */
const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    endDate: {
      type: Date,
    },
    location: {
      type: String,
      required: [true, 'Event location is required'],
      trim: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    attendees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    attendeesCount: {
      type: Number,
      default: 0,
    },
    maxAttendees: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    tags: [{
      type: String,
    }],
    price: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    // Webinar support
    isWebinar: {
      type: Boolean,
      default: false,
    },
    webinarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Webinar',
    },
    // Streaming
    streamUrl: String,
    recordingUrl: String,
    // Ticketing
    hasTickets: {
      type: Boolean,
      default: false,
    },
    tickets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
      },
    ],
    // Features
    features: {
      liveStreaming: { type: Boolean, default: false },
      multiCamera: { type: Boolean, default: false },
      polls: { type: Boolean, default: true },
      qa: { type: Boolean, default: true },
      chat: { type: Boolean, default: true },
      recording: { type: Boolean, default: false },
      captions: { type: Boolean, default: false },
      translations: { type: Boolean, default: false },
      vrSupport: { type: Boolean, default: false },
      arSupport: { type: Boolean, default: false },
    },
    // Registration
    requiresRegistration: {
      type: Boolean,
      default: false,
    },
    waitlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Analytics
    analytics: {
      peakViewers: { type: Number, default: 0 },
      averageViewers: { type: Number, default: 0 },
      totalWatchTime: { type: Number, default: 0 },
      engagementScore: { type: Number, default: 0 },
      checkIns: { type: Number, default: 0 },
    },
    // Recurring events
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrence: {
      pattern: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
      },
      interval: Number,
      endDate: Date,
    },
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Series',
    },
    // Networking
    networkingEnabled: {
      type: Boolean,
      default: false,
    },
    // Sponsorship
    sponsors: [
      {
        name: String,
        logo: String,
        link: String,
        tier: {
          type: String,
          enum: ['platinum', 'gold', 'silver', 'bronze'],
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

eventSchema.index({ date: 1 });
eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ organizer: 1, date: -1 });
eventSchema.index({ category: 1, date: 1 });
eventSchema.index({ status: 1, date: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ attendees: 1 });

module.exports = mongoose.model('Event', eventSchema);

