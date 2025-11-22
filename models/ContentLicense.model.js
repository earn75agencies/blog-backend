const mongoose = require('mongoose');

/**
 * Content License Schema
 * For post licensing management
 */
const contentLicenseSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      unique: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    licenseType: {
      type: String,
      enum: ['all-rights-reserved', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd', 'public-domain', 'custom'],
      default: 'all-rights-reserved',
    },
    customTerms: {
      type: String,
      maxlength: [5000, 'Custom terms cannot exceed 5000 characters'],
    },
    allowCommercialUse: {
      type: Boolean,
      default: false,
    },
    allowModifications: {
      type: Boolean,
      default: false,
    },
    requireAttribution: {
      type: Boolean,
      default: true,
    },
    allowSyndication: {
      type: Boolean,
      default: false,
    },
    pricing: {
      type: {
        type: String,
        enum: ['free', 'one-time', 'subscription', 'per-use'],
      },
      amount: Number,
      currency: {
        type: String,
        default: 'USD',
      },
    },
    usageRights: {
      print: Boolean,
      digital: Boolean,
      broadcast: Boolean,
      derivative: Boolean,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
contentLicenseSchema.index({ post: 1 }, { unique: true });
contentLicenseSchema.index({ author: 1, createdAt: -1 });
contentLicenseSchema.index({ licenseType: 1 });

const ContentLicense = mongoose.model('ContentLicense', contentLicenseSchema);

module.exports = ContentLicense;

