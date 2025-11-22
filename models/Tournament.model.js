const mongoose = require('mongoose');

/**
 * Tournament Schema
 * For creator tournament events
 */
const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: ['content-creation', 'engagement', 'viral', 'community', 'skill-based'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed', 'cancelled'],
      default: 'upcoming',
      index: true,
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        score: {
          type: Number,
          default: 0,
        },
        rank: Number,
      },
    ],
    participantsCount: {
      type: Number,
      default: 0,
    },
    prizes: [
      {
        position: Number,
        type: {
          type: String,
          enum: ['cash', 'tokens', 'badge', 'feature', 'subscription'],
        },
        amount: Number,
        description: String,
      },
    ],
    rules: [String],
    scoring: {
      posts: { type: Number, default: 10 },
      likes: { type: Number, default: 1 },
      comments: { type: Number, default: 2 },
      shares: { type: Number, default: 5 },
      views: { type: Number, default: 0.1 },
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    maxParticipants: {
      type: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
tournamentSchema.index({ slug: 1 }, { unique: true });
tournamentSchema.index({ status: 1, startDate: 1, endDate: 1 });
tournamentSchema.index({ type: 1, status: 1 });
tournamentSchema.index({ participantsCount: -1 });

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;

