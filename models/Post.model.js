const mongoose = require('mongoose');

/**
 * Post Schema
 */
const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      required: [true, 'Post excerpt is required'],
      trim: true,
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      minlength: [100, 'Content must be at least 100 characters'],
    },
    featuredImage: {
      type: String,
      default: null,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post author is required'],
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Post category is required'],
      index: true,
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    readingTime: {
      type: Number, // in minutes
      default: 0,
    },
    seoTitle: {
      type: String,
      maxlength: [70, 'SEO title cannot exceed 70 characters'],
    },
    seoDescription: {
      type: String,
      maxlength: [160, 'SEO description cannot exceed 160 characters'],
    },
    seoKeywords: [
      {
        type: String,
      },
    ],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    // Versioning support
    currentVersion: {
      type: Number,
      default: 1,
    },
    hasVersions: {
      type: Boolean,
      default: false,
    },
    // Content type
    contentType: {
      type: String,
      enum: ['text', 'video', 'audio', 'podcast', 'vr', 'ar', 'mixed', 'interactive'],
      default: 'text',
    },
    // Licensing
    licenseType: {
      type: String,
      enum: ['all-rights-reserved', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd', 'public-domain', 'custom'],
      default: 'all-rights-reserved',
    },
    // Paid content
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidContentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaidContent',
    },
    previewLength: {
      type: Number,
      default: 0,
    },
    // Accessibility
    accessibilityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    hasAccessibilityAudit: {
      type: Boolean,
      default: false,
    },
    // VR/AR content
    hasVRContent: {
      type: Boolean,
      default: false,
    },
    vrContentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VRContent',
    },
    // Collaborative editing
    isCollaborative: {
      type: Boolean,
      default: false,
    },
    collaborativePostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollaborativePost',
    },
    // Content features
    hasTextToSpeech: {
      type: Boolean,
      default: false,
    },
    hasHeatmap: {
      type: Boolean,
      default: false,
    },
    hasInteractiveContent: {
      type: Boolean,
      default: false,
    },
    interactiveContentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InteractiveContent',
    },
    // Regional targeting
    targetRegions: [String],
    targetLanguages: [String],
    // Content expiration
    expiresAt: Date,
    autoArchive: {
      type: Boolean,
      default: false,
    },
    // Editorial
    hasEditorialNotes: {
      type: Boolean,
      default: false,
    },
    // AI features
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    aiAssisted: {
      type: Boolean,
      default: false,
    },
    viralityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Content quality
    qualityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Engagement metrics
    engagementScore: {
      type: Number,
      default: 0,
      index: true,
    },
    shares: {
      type: Number,
      default: 0,
    },
    // Precomputed ranking fields for performance (updated by background jobs)
    rankingScore: {
      type: Number,
      default: 0,
      index: true, // For trending/popular posts
    },
    boost: {
      type: Number,
      default: 0, // Manual boost for featured content
      index: true,
    },
    // Cursor pagination support - composite key
    cursor: {
      type: String, // Format: timestamp_id (e.g., "1234567890_abc123")
      index: true,
    },
    // Subcategories
    subcategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Critical indexes for unlimited scalability and cursor pagination
postSchema.index({ slug: 1 }, { unique: true });
postSchema.index({ author: 1, createdAt: -1, _id: 1 }); // Cursor pagination for user posts
postSchema.index({ category: 1, status: 1, publishedAt: -1, _id: 1 }); // Category posts with cursor
postSchema.index({ status: 1, publishedAt: -1, _id: 1 }); // Main feed cursor pagination
postSchema.index({ tags: 1, status: 1, publishedAt: -1 }); // Tag-based queries
postSchema.index({ isFeatured: 1, publishedAt: -1, _id: 1 }); // Featured posts
postSchema.index({ rankingScore: -1, publishedAt: -1 }); // Trending/popular posts
postSchema.index({ boost: -1, publishedAt: -1 }); // Boosted content
postSchema.index({ cursor: 1 }); // Cursor-based pagination
postSchema.index({ createdAt: -1, _id: 1 }); // Default chronological order
postSchema.index({ views: -1 }); // Most viewed
postSchema.index({ 'likes': 1 }); // Likes count (array size)
postSchema.index({ title: 'text', content: 'text', excerpt: 'text' }); // Full-text search (fallback, ES is primary)
postSchema.index({ title: 'text', content: 'text', excerpt: 'text' });
postSchema.index({ contentType: 1, status: 1 });
postSchema.index({ isPaid: 1, status: 1 });
postSchema.index({ hasVRContent: 1 });
postSchema.index({ isCollaborative: 1 });
postSchema.index({ viralityScore: -1 });
postSchema.index({ engagementScore: -1 });
postSchema.index({ expiresAt: 1 });
postSchema.index({ targetRegions: 1 });
postSchema.index({ accessibilityScore: -1 });

// Virtual for comments
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
});

// Pre-save middleware to generate slug, cursor, and reading time
postSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Generate cursor for pagination (timestamp_id format)
  if (this.isNew || this.isModified('createdAt')) {
    const timestamp = this.createdAt ? this.createdAt.getTime() : Date.now();
    this.cursor = `${timestamp}_${this._id}`;
  }

  // Calculate reading time (average 200 words per minute)
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / 200);
  }

  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// Post-save hook to update ranking score (can be moved to background job)
postSchema.post('save', async function () {
  // Update ranking score asynchronously (non-blocking)
  setImmediate(async () => {
    const viewsWeight = 0.3;
    const likesWeight = 0.4;
    const commentsWeight = 0.2;
    const boostWeight = 0.1;
    
    const rankingScore = 
      (this.views || 0) * viewsWeight +
      (this.likes?.length || 0) * likesWeight +
      (this.commentsCount || 0) * commentsWeight +
      (this.boost || 0) * boostWeight;
    
    await mongoose.model('Post').updateOne(
      { _id: this._id },
      { rankingScore: Math.round(rankingScore) }
    );
  });
});

// Method to increment views
postSchema.methods.incrementViews = async function () {
  this.views += 1;
  await this.save();
};

// Method to toggle like
postSchema.methods.toggleLike = async function (userId) {
  const index = this.likes.indexOf(userId);
  if (index > -1) {
    this.likes.splice(index, 1);
  } else {
    this.likes.push(userId);
  }
  await this.save();
  return this.likes.length;
};

// Static method to find published posts
postSchema.statics.findPublished = function (query = {}) {
  return this.find({
    ...query,
    status: 'published',
    publishedAt: { $lte: new Date() },
  });
};

// Static method to search posts (fallback - ES is primary)
postSchema.statics.searchPosts = function (searchTerm) {
  return this.find({
    $text: { $search: searchTerm },
    status: 'published',
    publishedAt: { $lte: new Date() },
  }).sort({ score: { $meta: 'textScore' } });
};

// Static method for cursor-based pagination
postSchema.statics.paginateWithCursor = function (query = {}, options = {}) {
  const limit = Math.min(options.limit || 20, 100); // Max 100 per page
  let mongoQuery = this.find(query);
  
  if (options.cursor) {
    const [timestamp, id] = options.cursor.split('_');
    mongoQuery = mongoQuery.find({
      $or: [
        { createdAt: { $lt: new Date(parseInt(timestamp)) } },
        { createdAt: new Date(parseInt(timestamp)), _id: { $lt: id } }
      ]
    });
  }
  
  return mongoQuery
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1) // Fetch one extra to determine if there's a next page
    .lean();
};

const Post = mongoose.model('Post', postSchema);

module.exports = Post;

