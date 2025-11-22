const mongoose = require('mongoose');

/**
 * Category Schema - Materialized Path Pattern for Unlimited Scalability
 * Supports unlimited depth and millions of categories
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [100, 'Category name cannot exceed 100 characters'],
      index: true, // Text index for search
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    // Materialized Path: stores full path from root (e.g., "/tech/ai/machine-learning")
    path: {
      type: String,
      required: true,
      index: true, // Critical for tree queries
    },
    // Parent reference for backward compatibility and easy navigation
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    // Level in hierarchy (0 = root, 1 = first level, etc.)
    level: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    // Precomputed children count for performance
    childrenCount: {
      type: Number,
      default: 0,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    image: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    icon: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      default: null,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Metadata for extensibility (can store any additional data)
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

// Critical indexes for performance at scale
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ path: 1 }); // For path-based queries
categorySchema.index({ level: 1, isActive: 1 }); // For level filtering
categorySchema.index({ parent: 1, isActive: 1 }); // For children queries
categorySchema.index({ featured: 1, isActive: 1 }); // For featured categories
categorySchema.index({ name: 'text' }); // Text search index
categorySchema.index({ path: 1, level: 1 }); // Compound for tree traversal

// Virtual for posts count (computed on-demand, not stored)
categorySchema.virtual('postsCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

// Pre-save middleware to generate slug and path
categorySchema.pre('save', async function (next) {
  // Generate slug if not provided
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Generate materialized path
  if (this.isNew || this.isModified('parent')) {
    if (this.parent) {
      const parent = await mongoose.model('Category').findById(this.parent).lean();
      if (parent) {
        this.path = `${parent.path}/${this.slug}`;
        this.level = parent.level + 1;
      } else {
        this.path = `/${this.slug}`;
        this.level = 0;
      }
    } else {
      // Root category
      this.path = `/${this.slug}`;
      this.level = 0;
    }
  }

  next();
});

// Post-save middleware to update parent's childrenCount
categorySchema.post('save', async function () {
  if (this.parent) {
    await mongoose.model('Category').updateOne(
      { _id: this.parent },
      { $inc: { childrenCount: 1 } }
    );
  }
});

// Static method to get root categories
categorySchema.statics.getRoots = function (options = {}) {
  const query = { level: 0, isActive: true };
  if (options.featured) query.featured = true;
  return this.find(query).sort({ order: 1, name: 1 }).lean();
};

// Static method to get children by parent ID
categorySchema.statics.getChildren = function (parentId, options = {}) {
  const query = { parent: parentId, isActive: true };
  return this.find(query)
    .sort({ order: 1, name: 1 })
    .limit(options.limit || 50)
    .lean();
};

// Static method to get descendants by path (all children in subtree)
categorySchema.statics.getDescendants = function (path, options = {}) {
  const query = { path: new RegExp(`^${path}/`), isActive: true };
  return this.find(query)
    .sort({ level: 1, order: 1, name: 1 })
    .limit(options.limit || 100)
    .lean();
};

// Instance method to get full path as array
categorySchema.methods.getPathArray = function () {
  return this.path.split('/').filter(Boolean);
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;

