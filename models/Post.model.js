const mongoose = require('mongoose');

/**
 * Optimized Post Schema with Like & Share functionality
 * Maintains all existing features while adding social interactions
 */
//start schema definition
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
    // ===== UPDATED: Enhanced likes system for better performance =====
    likesCount: {
      type: Number,
      default: 0,
      index: true,  // Added index for sorting by popularity
    },
    // NEW: Track who liked for user-specific queries (separate collection recommended for scale)
    likedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
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
    // ===== NEW: Enhanced shares tracking =====
    shares: {
      type: Number,
      default: 0,
      index: true,  // Added index for analytics
    },
    // NEW: Detailed share tracking by platform
    sharesByPlatform: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    // NEW: Total share count including all platforms
    totalShares: {
      type: Number,
      default: 0,
      index: true,
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
    // ============================================
// ADD THESE FIELDS TO YOUR POST SCHEMA
// ============================================

// Add these fields to your existing postSchema definition:

podcastUrl: {
  type: String,
  default: null,
},
podcastDuration: {
  type: Number,
  default: 0,
},
viralityPrediction: {
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  factors: [String],
  lastUpdated: Date,
},
sentimentAnalysis: {
  score: Number,
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
  },
  emotions: [String],
  toxicity: Number,
  analyzedAt: Date,
},
seoOptimized: {
  type: Boolean,
  default: false,
},
isIndexedInPinecone: {
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
//end schema definition

// ===== CRITICAL INDEXES (Maintained + Enhanced) =====

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

// 7. Tag filtering
postSchema.index({ tags: 1, status: 1, publishedAt: -1 });

// 8. Most viewed posts
postSchema.index({ status: 1, views: -1 });

// 9. Cursor pagination
postSchema.index({ cursor: 1 });

// 10. Full-text search
postSchema.index({ title: 'text', content: 'text', excerpt: 'text' });

// 11. NEW: Most liked posts (for trending/popular)
postSchema.index({ status: 1, likesCount: -1, publishedAt: -1 });

// 12. NEW: Most shared posts (for viral content)
postSchema.index({ status: 1, totalShares: -1, publishedAt: -1 });

// Virtual for comments
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
});

// ===== PRE-SAVE MIDDLEWARE =====
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

  // NEW: Sync totalShares with shares
  if (this.isModified('shares') || this.isModified('sharesByPlatform')) {
    let platformSharesSum = 0;
    if (this.sharesByPlatform && this.sharesByPlatform.size > 0) {
      this.sharesByPlatform.forEach(count => {
        platformSharesSum += count;
      });
    }
    this.totalShares = this.shares + platformSharesSum;
  }

  next();
});

// ===== INSTANCE METHODS =====

// Method to increment views (optimized)
postSchema.methods.incrementViews = async function () {
  await mongoose.model('Post').updateOne(
    { _id: this._id },
    { $inc: { views: 1 } }
  );
};

// NEW: Method to like a post
postSchema.methods.likePost = async function (userId) {
  // Check if user already liked
  const alreadyLiked = this.likedBy.some(id => id.toString() === userId.toString());
  
  if (alreadyLiked) {
    throw new Error('Post already liked by this user');
  }

  // Add user to likedBy array and increment count
  await mongoose.model('Post').updateOne(
    { _id: this._id },
    { 
      $addToSet: { likedBy: userId },
      $inc: { likesCount: 1 }
    }
  );

  this.likedBy.push(userId);
  this.likesCount += 1;

  return {
    likesCount: this.likesCount,
    isLiked: true
  };
};

// NEW: Method to unlike a post
postSchema.methods.unlikePost = async function (userId) {
  // Check if user has liked the post
  const hasLiked = this.likedBy.some(id => id.toString() === userId.toString());
  
  if (!hasLiked) {
    throw new Error('Post not liked by this user');
  }

  // Remove user from likedBy array and decrement count
  await mongoose.model('Post').updateOne(
    { _id: this._id },
    { 
      $pull: { likedBy: userId },
      $inc: { likesCount: -1 }
    }
  );

  this.likedBy = this.likedBy.filter(id => id.toString() !== userId.toString());
  this.likesCount = Math.max(0, this.likesCount - 1);

  return {
    likesCount: this.likesCount,
    isLiked: false
  };
};

// NEW: Method to check if user has liked the post
postSchema.methods.isLikedBy = function (userId) {
  if (!userId) return false;
  return this.likedBy.some(id => id.toString() === userId.toString());
};

// NEW: Method to track share
postSchema.methods.trackShare = async function (platform = 'general') {
  const update = {
    $inc: { 
      shares: 1,
      totalShares: 1
    }
  };

  // Track by platform if specified
  if (platform && platform !== 'general') {
    const platformKey = `sharesByPlatform.${platform}`;
    update.$inc[platformKey] = 1;
  }

  await mongoose.model('Post').updateOne(
    { _id: this._id },
    update
  );

  this.shares += 1;
  this.totalShares += 1;

  if (platform && platform !== 'general') {
    const currentCount = this.sharesByPlatform.get(platform) || 0;
    this.sharesByPlatform.set(platform, currentCount + 1);
  }

  return {
    shares: this.shares,
    totalShares: this.totalShares
  };
};

// Original toggleLike method (kept for backward compatibility)
postSchema.methods.toggleLike = async function (userId) {
  // For better performance, create a separate PostLike collection
  const Like = mongoose.model('PostLike');
  const existingLike = await Like.findOne({ post: this._id, user: userId });
  
  if (existingLike) {
    await existingLike.deleteOne();
    await mongoose.model('Post').updateOne(
      { _id: this._id },
      { 
        $pull: { likedBy: userId },
        $inc: { likesCount: -1 }
      }
    );
    return this.likesCount - 1;
  } else {
    await Like.create({ post: this._id, user: userId });
    await mongoose.model('Post').updateOne(
      { _id: this._id },
      { 
        $addToSet: { likedBy: userId },
        $inc: { likesCount: 1 }
      }
    );
    return this.likesCount + 1;
  }
};

// ===== STATIC METHODS =====

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

// NEW: Get most liked posts
postSchema.statics.getMostLiked = function (limit = 10) {
  return this.find({
    status: 'published',
    publishedAt: { $lte: new Date() },
  })
    .sort({ likesCount: -1, publishedAt: -1 })
    .limit(limit)
    .populate('author', 'name username avatar')
    .populate('category', 'name slug')
    .lean();
};

// NEW: Get most shared posts
postSchema.statics.getMostShared = function (limit = 10) {
  return this.find({
    status: 'published',
    publishedAt: { $lte: new Date() },
  })
    .sort({ totalShares: -1, publishedAt: -1 })
    .limit(limit)
    .populate('author', 'name username avatar')
    .populate('category', 'name slug')
    .lean();
};

// NEW: Get trending posts (combination of likes, shares, views)
postSchema.statics.getTrending = function (limit = 10, days = 7) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  return this.find({
    status: 'published',
    publishedAt: { 
      $lte: new Date(),
      $gte: dateThreshold 
    },
  })
    .sort({ engagementScore: -1, likesCount: -1, totalShares: -1 })
    .limit(limit)
    .populate('author', 'name username avatar')
    .populate('category', 'name slug')
    .lean();
};
// ============================================
// ADD THESE HOOKS AT THE END OF YOUR FILE
// (After all other pre/post hooks, before module.exports)
// ============================================

// Auto-index published posts to Pinecone
postSchema.post('save', async function(doc) {
  // Only index published posts
  if (doc.status === 'published' && !doc.isIndexedInPinecone) {
    try {
      const pineconeService = require('../services/ai/pinecone.service');
      
      if (pineconeService.isAvailable()) {
        // Populate required fields for indexing
        await doc.populate('category', 'name');
        await doc.populate('tags', 'name');
        await doc.populate('author', 'username');
        
        await pineconeService.upsertPost(doc);
        
        // Mark as indexed
        doc.isIndexedInPinecone = true;
        await doc.save();
        
        console.log(`✅ Post ${doc._id} indexed in Pinecone`);
      }
    } catch (error) {
      console.error(`❌ Failed to index post ${doc._id}:`, error.message);
      // Don't throw - indexing failure shouldn't break post creation
    }
  }
});

// Remove from Pinecone when post is deleted
postSchema.post('remove', async function(doc) {
  try {
    const pineconeService = require('../services/ai/pinecone.service');
    
    if (pineconeService.isAvailable()) {
      await pineconeService.deletePost(doc._id);
      console.log(`✅ Post ${doc._id} removed from Pinecone`);
    }
  } catch (error) {
    console.error(`❌ Failed to remove post ${doc._id} from Pinecone:`, error.message);
  }
});

// Update Pinecone when post is updated
postSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.status === 'published') {
    try {
      const pineconeService = require('../services/ai/pinecone.service');
      
      if (pineconeService.isAvailable()) {
        await doc.populate('category', 'name');
        await doc.populate('tags', 'name');
        await doc.populate('author', 'username');
        
        await pineconeService.upsertPost(doc);
        console.log(`✅ Post ${doc._id} updated in Pinecone`);
      }
    } catch (error) {
      console.error(`❌ Failed to update post ${doc._id} in Pinecone:`, error.message);
    }
  }
});
const Post = mongoose.model('Post', postSchema);

module.exports = Post;