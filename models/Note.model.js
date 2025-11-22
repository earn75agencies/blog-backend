const mongoose = require('mongoose');

/**
 * Note Schema
 * User notes/annotations on blog posts
 * Supports unlimited notes per user and per post
 */
const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    // Optional: Reference to specific content (for inline annotations)
    contentReference: {
      type: String, // Could be a text snippet, paragraph ID, etc.
      default: null,
    },
    // Note content
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
      maxlength: [5000, 'Note cannot exceed 5000 characters'],
    },
    // Optional: Highlighted text from the post
    highlightedText: {
      type: String,
      maxlength: [500, 'Highlighted text cannot exceed 500 characters'],
    },
    // Position in the post (for inline notes)
    position: {
      paragraphIndex: Number,
      charIndex: Number,
    },
    // Note type
    type: {
      type: String,
      enum: ['note', 'highlight', 'annotation', 'bookmark', 'reminder'],
      default: 'note',
      index: true,
    },
    // Color for highlights (optional)
    color: {
      type: String,
      default: '#FFEB3B', // Yellow highlight by default
    },
    // Tags for organizing notes
    tags: [String],
    // Privacy settings
    isPrivate: {
      type: Boolean,
      default: true, // Notes are private by default
    },
    // Pinned note (shows at top)
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Note metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for unlimited scalability
noteSchema.index({ user: 1, post: 1, createdAt: -1 }); // User's notes on a post
noteSchema.index({ user: 1, createdAt: -1 }); // All user notes
noteSchema.index({ post: 1, createdAt: -1 }); // All notes on a post (for public notes)
noteSchema.index({ user: 1, type: 1, createdAt: -1 }); // Notes by type
noteSchema.index({ user: 1, isPinned: -1, createdAt: -1 }); // Pinned notes
noteSchema.index({ user: 1, tags: 1 }); // Notes by tags
noteSchema.index({ content: 'text' }); // Full-text search on note content

// Virtual for note author (user)
noteSchema.virtual('author', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
});

// Static method to get user notes for a post
noteSchema.statics.getUserNotesForPost = function (userId, postId) {
  return this.find({
    user: userId,
    post: postId,
  })
    .sort({ isPinned: -1, createdAt: -1 })
    .lean();
};

// Static method to get all user notes
noteSchema.statics.getUserNotes = function (userId, options = {}) {
  const {
    type,
    tags,
    postId,
    limit = 50,
    skip = 0,
  } = options;

  const query = { user: userId };

  if (type) query.type = type;
  if (tags && tags.length > 0) query.tags = { $in: tags };
  if (postId) query.post = postId;

  return this.find(query)
    .populate('post', 'title slug excerpt featuredImage')
    .sort({ isPinned: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static method to search user notes
noteSchema.statics.searchUserNotes = function (userId, searchQuery) {
  return this.find({
    user: userId,
    $text: { $search: searchQuery },
  })
    .populate('post', 'title slug excerpt')
    .sort({ score: { $meta: 'textScore' } })
    .lean();
};

// Instance method to toggle pin
noteSchema.methods.togglePin = async function () {
  this.isPinned = !this.isPinned;
  await this.save();
  return this.isPinned;
};

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;



