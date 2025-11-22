const mongoose = require('mongoose');

/**
 * Notification Schema
 */
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must belong to a user'],
      index: true,
    },
    type: {
      type: String,
      enum: [
        'post_like',
        'post_comment',
        'comment_reply',
        'post_published',
        'user_follow',
        'mention',
        'system',
      ],
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    link: {
      type: String,
      default: null,
    },
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    relatedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    relatedComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Enhanced features
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    group: {
      type: String,
      index: true,
    },
    channels: [
      {
        type: String,
        enum: ['push', 'email', 'sms', 'in-app'],
      },
    ],
    sentChannels: [
      {
        channel: String,
        sentAt: Date,
        status: {
          type: String,
          enum: ['sent', 'delivered', 'failed', 'opened'],
        },
      },
    ],
    scheduledFor: Date,
    expiresAt: Date,
    actionUrl: String,
    actionLabel: String,
    image: String,
    sound: String,
    vibration: Boolean,
    badge: Number,
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    // AI features
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    personalization: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    // Analytics
    analytics: {
      opened: { type: Boolean, default: false },
      openedAt: Date,
      clicked: { type: Boolean, default: false },
      clickedAt: Date,
      dismissed: { type: Boolean, default: false },
      dismissedAt: Date,
    },
    // Translation
    language: {
      type: String,
      default: 'en',
    },
    translations: [
      {
        language: String,
        title: String,
        message: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ group: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ 'analytics.opened': 1 });

// Pre-save middleware
notificationSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

