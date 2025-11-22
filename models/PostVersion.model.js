const mongoose = require('mongoose');

/**
 * Post Version Schema
 * For post versioning and rollback per paragraph
 */
const postVersionSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changes: [
      {
        paragraphId: String,
        action: {
          type: String,
          enum: ['create', 'update', 'delete', 'move'],
        },
        oldContent: String,
        newContent: String,
        position: Number,
      },
    ],
    content: {
      title: String,
      excerpt: String,
      body: String,
      featuredImage: String,
    },
    metadata: {
      reason: String,
      notes: String,
      tags: [String],
      category: mongoose.Schema.Types.ObjectId,
    },
    isAutoSave: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
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
postVersionSchema.index({ post: 1, version: -1 });
postVersionSchema.index({ author: 1, createdAt: -1 });
postVersionSchema.index({ createdAt: -1 });

const PostVersion = mongoose.model('PostVersion', postVersionSchema);

module.exports = PostVersion;

