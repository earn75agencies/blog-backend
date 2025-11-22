const mongoose = require('mongoose');

/**
 * Search History Schema
 * For tracking user searches
 */
const searchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    query: {
      type: String,
      required: true,
      index: true,
    },
    filters: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    results: {
      count: Number,
      clicked: [
        {
          content: mongoose.Schema.Types.ObjectId,
          contentType: String,
          clickedAt: Date,
        },
      ],
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
    },
    location: {
      country: String,
      region: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
searchHistorySchema.index({ user: 1, createdAt: -1 });
searchHistorySchema.index({ query: 1, createdAt: -1 });

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);

module.exports = SearchHistory;
