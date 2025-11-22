const mongoose = require('mongoose');

/**
 * Activity Feed Schema
 * For tracking user activities and creating activity feeds
 */
const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'post_created',
        'post_published',
        'post_liked',
        'post_commented',
        'comment_liked',
        'user_followed',
        'series_subscribed',
        'course_enrolled',
        'course_completed',
        'hashtag_followed',
        'bookmark_added',
        'profile_updated',
        'achievement_earned',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    relatedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    relatedComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    relatedSeries: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Series',
    },
    relatedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    relatedHashtag: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hashtag',
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ isPublic: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });
activitySchema.index({ relatedPost: 1 });
activitySchema.index({ relatedUser: 1 });

// Compound index for activity feed queries
activitySchema.index({ user: 1, isPublic: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;

