const mongoose = require('mongoose');

/**
 * Tag Schema
 */
const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tag name is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, 'Tag name must be at least 2 characters'],
      maxlength: [30, 'Tag name cannot exceed 30 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    usageCount: {
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

// Indexes for unlimited scalability
tagSchema.index({ slug: 1 }, { unique: true });
tagSchema.index({ usageCount: -1 }); // For top tags
tagSchema.index({ name: 'text' }); // Text search index
tagSchema.index({ name: 1 }); // For autocomplete prefix matching

// Virtual for posts
tagSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'tags',
});

// Pre-save middleware to generate slug
tagSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Method to increment usage count
tagSchema.methods.incrementUsage = async function () {
  this.usageCount += 1;
  await this.save();
};

// Method to decrement usage count
tagSchema.methods.decrementUsage = async function () {
  if (this.usageCount > 0) {
    this.usageCount -= 1;
    await this.save();
  }
};

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;

