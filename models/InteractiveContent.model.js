const mongoose = require('mongoose');

/**
 * Interactive Content Schema
 * For polls, quizzes, games, choose-your-own-adventure
 */
const interactiveContentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['poll', 'quiz', 'game', 'story', 'survey', 'interactive-video'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    // For polls
    pollOptions: [
      {
        text: String,
        votes: { type: Number, default: 0 },
        voters: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
      },
    ],
    // For quizzes
    questions: [
      {
        question: String,
        type: {
          type: String,
          enum: ['multiple-choice', 'true-false', 'short-answer'],
        },
        options: [String],
        correctAnswer: mongoose.Schema.Types.Mixed,
        points: { type: Number, default: 1 },
      },
    ],
    // For games
    gameData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    // For interactive stories
    storyNodes: [
      {
        id: String,
        content: String,
        choices: [
          {
            text: String,
            nextNode: String,
          },
        ],
      },
    ],
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        responses: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
        score: { type: Number, default: 0 },
        completedAt: Date,
      },
    ],
    participantsCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
interactiveContentSchema.index({ author: 1, createdAt: -1 });
interactiveContentSchema.index({ type: 1, isActive: 1 });
interactiveContentSchema.index({ participantsCount: -1 });
interactiveContentSchema.index({ createdAt: -1 });

const InteractiveContent = mongoose.model('InteractiveContent', interactiveContentSchema);

module.exports = InteractiveContent;

