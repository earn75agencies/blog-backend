const mongoose = require('mongoose');

/**
 * Mention Schema
 * For tracking user mentions in posts and comments
 */
const mentionSchema = new mongoose.Schema(
  {
    mentionedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mentionedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      index: true,
    },
    context: {
      type: String,
      maxlength: [200, 'Context cannot exceed 200 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    // Message mentions
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      index: true,
    },
    // Story mentions
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },
    // Privacy
    privacy: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
    },
    // Engagement
    engagementScore: {
      type: Number,
      default: 0,
    },
    // Moderation
    isSpam: {
      type: Boolean,
      default: false,
    },
    spamScore: {
      type: Number,
      default: 0,
    },
    // History tracking
    history: [
      {
        action: String,
        timestamp: { type: Date, default: Date.now },
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
mentionSchema.index({ mentionedUser: 1, isRead: 1, createdAt: -1 });
mentionSchema.index({ mentionedUser: 1, createdAt: -1 });
mentionSchema.index({ post: 1 });
mentionSchema.index({ comment: 1 });
mentionSchema.index({ message: 1 });
mentionSchema.index({ story: 1 });
mentionSchema.index({ createdAt: -1 });
mentionSchema.index({ isSpam: 1, spamScore: -1 });

// Pre-save middleware to set readAt
mentionSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

const Mention = mongoose.model('Mention', mentionSchema);

module.exports = Mention;

