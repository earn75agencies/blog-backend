const mongoose = require('mongoose');

/**
 * Course Discussion Schema
 * For course discussion forums
 */
const courseDiscussionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: true,
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    parentPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseDiscussion',
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CourseDiscussion',
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
courseDiscussionSchema.index({ course: 1, createdAt: -1 });
courseDiscussionSchema.index({ lesson: 1, createdAt: -1 });
courseDiscussionSchema.index({ author: 1, createdAt: -1 });
courseDiscussionSchema.index({ isPinned: 1, createdAt: -1 });
courseDiscussionSchema.index({ isResolved: 1 });

const CourseDiscussion = mongoose.model('CourseDiscussion', courseDiscussionSchema);

module.exports = CourseDiscussion;

