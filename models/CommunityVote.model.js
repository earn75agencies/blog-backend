const mongoose = require('mongoose');

/**
 * Community Vote Schema
 * For community voting systems
 */
const communityVoteSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    content: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['post', 'comment', 'proposal', 'event'],
      required: true,
    },
    type: {
      type: String,
      enum: ['upvote', 'downvote', 'approve', 'reject', 'priority'],
      required: true,
    },
    voter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    weight: {
      type: Number,
      default: 1,
    },
    reason: {
      type: String,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
communityVoteSchema.index({ community: 1, content: 1, contentType: 1, voter: 1 }, { unique: true });
communityVoteSchema.index({ content: 1, contentType: 1, type: 1 });
communityVoteSchema.index({ voter: 1, createdAt: -1 });
communityVoteSchema.index({ createdAt: -1 });

const CommunityVote = mongoose.model('CommunityVote', communityVoteSchema);

module.exports = CommunityVote;

