const mongoose = require('mongoose');

/**
 * Template Schema
 * For reusable post and page templates
 */
const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    type: {
      type: String,
      enum: ['post', 'page', 'email', 'newsletter'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['blog', 'landing', 'sales', 'course', 'product', 'other'],
    },
    content: {
      type: String,
      required: true,
    },
    structure: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    variables: [
      {
        name: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'image', 'url', 'html'],
        },
        defaultValue: mongoose.Schema.Types.Mixed,
        required: Boolean,
      },
    ],
    thumbnail: {
      type: String,
    },
    preview: {
      type: String,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
templateSchema.index({ type: 1, isPublic: 1, createdAt: -1 });
templateSchema.index({ author: 1, createdAt: -1 });
templateSchema.index({ isFeatured: 1, usageCount: -1 });
templateSchema.index({ tags: 1 });
templateSchema.index({ createdAt: -1 });

// Method to increment usage
templateSchema.methods.incrementUsage = async function () {
  this.usageCount += 1;
  await this.save();
  return this;
};

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;

