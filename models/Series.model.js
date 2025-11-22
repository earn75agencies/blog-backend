const mongoose = require('mongoose');

/**
 * Series Schema
 * For grouping posts into series or courses
 */
const seriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Series title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Series description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    posts: [
      {
        post: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Post',
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    featuredImage: {
      type: String,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    views: {
      type: Number,
      default: 0,
    },
    subscribers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    subscribersCount: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    estimatedReadingTime: {
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
    // Nested series support
    parentSeries: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Series',
    },
    childSeries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Series',
      },
    ],
    // Versioning
    version: {
      type: Number,
      default: 1,
    },
    versionHistory: [
      {
        version: Number,
        content: {
          title: String,
          description: String,
          posts: Array,
        },
        changedAt: Date,
        changedBy: mongoose.Schema.Types.ObjectId,
      },
    ],
    // Scheduling
    scheduledPosts: [
      {
        post: mongoose.Schema.Types.ObjectId,
        scheduledFor: Date,
        published: { type: Boolean, default: false },
      },
    ],
    // Analytics
    analytics: {
      totalViews: { type: Number, default: 0 },
      totalEngagement: { type: Number, default: 0 },
      averageEngagement: { type: Number, default: 0 },
      subscriberGrowth: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
    },
    // Multi-author
    coAuthors: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['author', 'editor', 'reviewer'],
          default: 'author',
        },
        permissions: {
          canEdit: { type: Boolean, default: true },
          canPublish: { type: Boolean, default: false },
        },
      },
    ],
    // Social sharing
    shareCount: {
      type: Number,
      default: 0,
    },
    // AI recommendations
    aiRecommended: {
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
seriesSchema.index({ slug: 1 }, { unique: true });
seriesSchema.index({ author: 1, createdAt: -1 });
seriesSchema.index({ status: 1, publishedAt: -1 });
seriesSchema.index({ isPublished: 1, publishedAt: -1 });
seriesSchema.index({ isFeatured: 1, publishedAt: -1 });
seriesSchema.index({ category: 1, status: 1 });
seriesSchema.index({ tags: 1 });
seriesSchema.index({ createdAt: -1 });
seriesSchema.index({ views: -1 });
seriesSchema.index({ subscribersCount: -1 });

// Virtual for posts count
seriesSchema.virtual('postsCount').get(function () {
  return this.posts ? this.posts.length : 0;
});

// Method to add post to series
seriesSchema.methods.addPost = async function (postId, order) {
  const existingPost = this.posts.find((p) => p.post.toString() === postId.toString());
  if (!existingPost) {
    this.posts.push({ post: postId, order: order || this.posts.length });
    await this.save();
  }
  return this;
};

// Method to remove post from series
seriesSchema.methods.removePost = async function (postId) {
  this.posts = this.posts.filter((p) => p.post.toString() !== postId.toString());
  await this.save();
  return this;
};

// Method to increment views
seriesSchema.methods.incrementViews = async function () {
  this.views += 1;
  await this.save();
  return this;
};

// Method to subscribe to series
seriesSchema.methods.subscribe = async function (userId) {
  if (!this.subscribers.includes(userId)) {
    this.subscribers.push(userId);
    this.subscribersCount += 1;
    await this.save();
  }
  return this;
};

// Method to unsubscribe from series
seriesSchema.methods.unsubscribe = async function (userId) {
  const index = this.subscribers.indexOf(userId);
  if (index > -1) {
    this.subscribers.splice(index, 1);
    this.subscribersCount -= 1;
    await this.save();
  }
  return this;
};

// Pre-save middleware to generate slug
seriesSchema.pre('save', async function (next) {
  if (this.isModified('title') && !this.slug) {
    const slugify = require('../utils/string.util').slugify;
    let slug = slugify(this.title);
    let existingSeries = await mongoose.model('Series').findOne({ slug });
    let counter = 1;
    while (existingSeries) {
      slug = `${slugify(this.title)}-${counter}`;
      existingSeries = await mongoose.model('Series').findOne({ slug });
      counter++;
    }
    this.slug = slug;
  }
  next();
});

// Pre-save middleware to set publishedAt
seriesSchema.pre('save', async function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
    this.isPublished = true;
  }
  if (this.status !== 'published') {
    this.isPublished = false;
  }
  next();
});

const Series = mongoose.model('Series', seriesSchema);

module.exports = Series;

