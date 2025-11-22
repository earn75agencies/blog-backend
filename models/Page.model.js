const mongoose = require('mongoose');

/**
 * Static Page Schema (About, Contact, Privacy Policy, etc.)
 */
const pageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Page title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: [true, 'Page content is required'],
    },
    excerpt: {
      type: String,
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    template: {
      type: String,
      enum: ['default', 'full-width', 'sidebar'],
      default: 'default',
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
    order: {
      type: Number,
      default: 0,
    },
    showInMenu: {
      type: Boolean,
      default: true,
    },
    menuPosition: {
      type: String,
      enum: ['header', 'footer', 'both'],
      default: 'header',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
pageSchema.index({ slug: 1 });
pageSchema.index({ isPublished: 1, order: 1 });

// Pre-save middleware to generate slug
pageSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

const Page = mongoose.model('Page', pageSchema);

module.exports = Page;

