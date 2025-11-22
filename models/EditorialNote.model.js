const mongoose = require('mongoose');

/**
 * Editorial Note Schema
 * For editorial notes and annotations
 */
const editorialNoteSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['note', 'suggestion', 'correction', 'question', 'highlight'],
      default: 'note',
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'Note cannot exceed 2000 characters'],
    },
    targetElement: {
      type: String, // CSS selector or paragraph ID
    },
    position: {
      start: Number,
      end: Number,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
editorialNoteSchema.index({ post: 1, createdAt: -1 });
editorialNoteSchema.index({ author: 1, createdAt: -1 });
editorialNoteSchema.index({ isResolved: 1, priority: 1 });

const EditorialNote = mongoose.model('EditorialNote', editorialNoteSchema);

module.exports = EditorialNote;

