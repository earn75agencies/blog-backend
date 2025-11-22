const mongoose = require('mongoose');

/**
 * Workspace Schema
 * For team collaboration
 */
const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['admin', 'editor', 'viewer', 'contributor'],
          default: 'contributor',
        },
        permissions: {
          canEdit: { type: Boolean, default: false },
          canPublish: { type: Boolean, default: false },
          canDelete: { type: Boolean, default: false },
          canManage: { type: Boolean, default: false },
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
    ],
    mediaLibrary: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    settings: {
      isPublic: { type: Boolean, default: false },
      allowInvites: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
workspaceSchema.index({ owner: 1, createdAt: -1 });
workspaceSchema.index({ 'members.user': 1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = Workspace;
