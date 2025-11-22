const mongoose = require('mongoose');

/**
 * Chat/Messaging Schema
 * For real-time messaging between users
 */
const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    type: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
    },
    groupName: {
      type: String,
    },
    groupAvatar: {
      type: String,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: {
      type: Date,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        archivedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    settings: {
      muted: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ type: 1, lastMessageAt: -1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ 'participants': 1, type: 1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;

