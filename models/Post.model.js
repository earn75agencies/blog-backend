const mongoose = require('mongoose');

/**
 * Optimized Post Schema - Reduced indexes for better write performance
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
    likesCount: {  // CHANGED: Store count instead of array for better performance
      type: Number,
      default: 0,
    },
    readingTime: {
      type: Number,
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
    seoKeywords: [String],
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
    currentVersion: {
      type: Number,
      default: 1,
    },
    hasVersions: {
      type: Boolean,
      default: false,
    },
    contentType: {
      type: String,
      enum: ['text', 'video', 'audio', 'podcast', 'vr', 'ar', 'mixed', 'interactive'],
      default: 'text',
    },
    licenseType: {
      type: String,
      enum: ['all-rights-reserved', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd', 'public-domain', 'custom'],
      default: 'all-rights-reserved',
    },
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
    hasVRContent: {
      type: Boolean,
      default: false,
    },
    vrContentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VRContent',
    },
    isCollaborative: {
      type: Boolean,
      default: false,
    },
    collaborativePostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollaborativePost',
    },
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
    targetRegions: [String],
    targetLanguages: [String],
    expiresAt: Date,
    autoArchive: {
      type: Boolean,
      default: false,
    },
    hasEditorialNotes: {
      type: Boolean,
      default: false,
    },
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
    qualityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    engagementScore: {
      type: Number,
      default: 0,
      index: true,
    },
    shares: {
      type: Number,
      default: 0,
    },
    rankingScore: {
      type: Number,
      default: 0,
      index: true,
    },
    boost: {
      type: Number,
      default: 0,
      index: true,
    },
    cursor: {
      type: String,
      index: true,
    },
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

// ===== CRITICAL INDEXES ONLY (Reduced from 26+ to 10) =====

// 1. Unique slug for lookups
postSchema.index({ slug: 1 }, { unique: true });

// 2. Main feed pagination (most common query)
postSchema.index({ status: 1, publishedAt: -1, _id: 1 });

// 3. User's posts
postSchema.index({ author: 1, status: 1, createdAt: -1 });

// 4. Category filtering
postSchema.index({ category: 1, status: 1, publishedAt: -1 });

// 5. Featured posts
postSchema.index({ isFeatured: 1, status: 1, publishedAt: -1 });

// 6. Trending/popular (ranking-based)
postSchema.index({ status: 1, rankingScore: -1, publishedAt: -1 });

// 7. Tag filtering (keep if heavily used)
postSchema.index({ tags: 1, status: 1, publishedAt: -1 });

// 8. Most viewed posts
postSchema.index({ status: 1, views: -1 });

// 9. Cursor pagination
postSchema.index({ cursor: 1 });

// 10. Full-text search (ONLY ONE - REMOVED DUPLICATE!)
postSchema.index({ title: 'text', content: 'text', excerpt: 'text' });

// REMOVED INDEXES (move these queries to application layer or use less frequently):
// - contentType compound index (query in memory if needed)
// - isPaid compound index (filter in application)
// - hasVRContent, isCollaborative (low cardinality, poor index performance)
// - viralityScore, accessibilityScore (not frequently queried)
// - expiresAt (use TTL index if needed or background job)
// - targetRegions (array index, expensive)
// - likes array index (replaced with likesCount)

// Virtual for comments (only populate when explicitly needed)
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
});

// Pre-save middleware (lightweight operations only)
postSchema.pre('save', function (next) {
  // Generate slug
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Generate cursor
  if (this.isNew || this.isModified('createdAt')) {
    const timestamp = this.createdAt ? this.createdAt.getTime() : Date.now();
    this.cursor = `${timestamp}_${this._id}`;
  }

  // Calculate reading time
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / 200);
  }

  // Set publishedAt
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// REMOVED: Blocking post-save hook for ranking score
// Instead, update ranking scores via:
// 1. Background job (every 15-30 minutes)
// 2. Queue system (Bull/BullMQ)
// 3. Only when engagement metrics change significantly

// Method to increment views (optimized)
postSchema.methods.incrementViews = async function () {
  // Use atomic update instead of save
  await mongoose.model('Post').updateOne(
    { _id: this._id },
    { $inc: { views: 1 } }
  );
};

// Method to toggle like (optimized with separate PostLike collection recommended)
postSchema.methods.toggleLike = async function (userId) {
  // Instead of storing array, increment/decrement counter
  // You should create a separate PostLike collection for scalability
  const Like = mongoose.model('PostLike');
  const existingLike = await Like.findOne({ post: this._id, user: userId });
  
  if (existingLike) {
    await existingLike.deleteOne();
    await mongoose.model('Post').updateOne(
      { _id: this._id },
      { $inc: { likesCount: -1 } }
    );
    return this.likesCount - 1;
  } else {
    await Like.create({ post: this._id, user: userId });
    await mongoose.model('Post').updateOne(
      { _id: this._id },
      { $inc: { likesCount: 1 } }
    );
    return this.likesCount + 1;
  }
};

// Static methods
postSchema.statics.findPublished = function (query = {}) {
  return this.find({
    ...query,
    status: 'published',
    publishedAt: { $lte: new Date() },
  });
};

postSchema.statics.searchPosts = function (searchTerm) {
  return this.find({
    $text: { $search: searchTerm },
    status: 'published',
    publishedAt: { $lte: new Date() },
  }).sort({ score: { $meta: 'textScore' } });
};

postSchema.statics.paginateWithCursor = function (query = {}, options = {}) {
  const limit = Math.min(options.limit || 20, 100);
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
    .limit(limit + 1)
    .lean();
};

const Post = mongoose.model('Post', postSchema);

module.exports = Post;