const mongoose = require('mongoose');

/**
 * Playlist Schema
 * For smart playlists for media collections
 */
const playlistSchema = new mongoose.Schema(
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
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [
      {
        media: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Media',
        },
        order: Number,
        addedAt: { type: Date, default: Date.now },
      },
    ],
    isSmart: {
      type: Boolean,
      default: false,
    },
    smartRules: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    followersCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
playlistSchema.index({ creator: 1, createdAt: -1 });
playlistSchema.index({ isPublic: 1, followersCount: -1 });

const Playlist = mongoose.model('Playlist', playlistSchema);

module.exports = Playlist;

