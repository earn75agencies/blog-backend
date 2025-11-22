const mongoose = require('mongoose');

/**
 * Message Schema
 * For individual chat messages
 */
const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'link', 'system'],
      default: 'text',
    },
    attachments: [
      {
        url: String,
        type: String,
        name: String,
        size: Number,
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    editedAt: {
      type: Date,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    deletedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // Enhanced features
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        emoji: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pinnedAt: Date,
    isEphemeral: {
      type: Boolean,
      default: false,
    },
    expiresAt: Date,
    // Voice & Video
    voiceMessage: {
      url: String,
      duration: Number,
    },
    videoMessage: {
      url: String,
      thumbnail: String,
      duration: Number,
    },
    // AI features
    aiSummary: String,
    aiSuggestedResponse: String,
    // Translation
    originalLanguage: String,
    translations: [
      {
        language: String,
        content: String,
      },
    ],
    // Delivery
    deliveryStatus: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
      default: 'sending',
    },
    deliveredAt: Date,
    readAt: Date,
    // Moderation
    isModerated: {
      type: Boolean,
      default: false,
    },
    moderationScore: {
      type: Number,
      default: 0,
    },
    // Search
    searchableContent: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ isDeleted: 1, createdAt: -1 });
messageSchema.index({ isPinned: 1, createdAt: -1 });
messageSchema.index({ mentions: 1 });
messageSchema.index({ searchableContent: 'text' });
messageSchema.index({ expiresAt: 1 });

// Pre-save middleware to update chat's last message
messageSchema.pre('save', async function (next) {
  if (this.isNew && !this.isDeleted) {
    const Chat = mongoose.model('Chat');
    await Chat.findByIdAndUpdate(this.chat, {
      lastMessage: this._id,
      lastMessageAt: this.createdAt || new Date(),
    });
  }
  next();
});

// Method to mark as read
messageSchema.methods.markAsRead = async function (userId) {
  const existingRead = this.readBy.find(
    (r) => r.user.toString() === userId.toString()
  );
  
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date(),
    });
    await this.save();
  }
  
  return this;
};

// Method to edit message
messageSchema.methods.edit = async function (newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  await this.save();
  return this;
};

// Method to delete message
messageSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
  return this;
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

