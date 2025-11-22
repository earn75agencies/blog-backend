const mongoose = require('mongoose');

/**
 * Collaborative Post Schema
 * For multi-author real-time editing
 */
const collaborativePostSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      unique: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collaborators: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['editor', 'reviewer', 'viewer'],
          default: 'editor',
        },
        permissions: {
          canEdit: { type: Boolean, default: true },
          canDelete: { type: Boolean, default: false },
          canPublish: { type: Boolean, default: false },
          canInvite: { type: Boolean, default: false },
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    activeEditors: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        cursorPosition: {
          line: Number,
          column: Number,
        },
        selection: {
          start: Number,
          end: Number,
        },
        lastActivity: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    editHistory: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        action: {
          type: String,
          enum: ['insert', 'delete', 'format', 'move'],
        },
        content: String,
        position: Number,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    conflictResolution: {
      strategy: {
        type: String,
        enum: ['last-write-wins', 'operational-transform', 'merge'],
        default: 'operational-transform',
      },
      conflicts: [
        {
          user1: mongoose.Schema.Types.ObjectId,
          user2: mongoose.Schema.Types.ObjectId,
          content1: String,
          content2: String,
          resolved: { type: Boolean, default: false },
          resolvedBy: mongoose.Schema.Types.ObjectId,
          resolvedAt: Date,
        },
      ],
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
collaborativePostSchema.index({ post: 1 }, { unique: true });
collaborativePostSchema.index({ owner: 1, createdAt: -1 });
collaborativePostSchema.index({ 'collaborators.user': 1 });
collaborativePostSchema.index({ 'activeEditors.user': 1 });

const CollaborativePost = mongoose.model('CollaborativePost', collaborativePostSchema);

module.exports = CollaborativePost;

