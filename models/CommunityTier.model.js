const mongoose = require('mongoose');

/**
 * Community Tier Schema
 * For community tier levels
 */
const communityTierSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    level: {
      type: Number,
      required: true,
      min: 1,
    },
    requirements: {
      reputation: { type: Number, default: 0 },
      posts: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      followers: { type: Number, default: 0 },
      badges: [mongoose.Schema.Types.ObjectId],
      achievements: [mongoose.Schema.Types.ObjectId],
    },
    benefits: {
      access: [String],
      features: [String],
      permissions: {
        canPost: { type: Boolean, default: true },
        canModerate: { type: Boolean, default: false },
        canInvite: { type: Boolean, default: false },
        canCreateEvents: { type: Boolean, default: false },
      },
      discounts: {
        type: Map,
        of: Number,
      },
    },
    color: {
      type: String,
    },
    icon: {
      type: String,
    },
    isDefault: {
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
communityTierSchema.index({ community: 1, level: 1 }, { unique: true });
communityTierSchema.index({ community: 1, isDefault: 1 });

const CommunityTier = mongoose.model('CommunityTier', communityTierSchema);

module.exports = CommunityTier;

