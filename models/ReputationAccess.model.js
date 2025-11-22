const mongoose = require('mongoose');

/**
 * Reputation-Based Access Control Schema
 * For reputation-based access control
 */
const reputationAccessSchema = new mongoose.Schema(
  {
    content: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['post', 'community', 'event', 'course', 'feature'],
      required: true,
    },
    requiredReputation: {
      type: Number,
      required: true,
      min: 0,
    },
    requiredLevel: {
      type: String,
      enum: ['newbie', 'member', 'trusted', 'expert', 'legendary'],
    },
    requiredBadges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Badge',
      },
    ],
    requiredAchievements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Achievement',
      },
    ],
    accessRules: {
      allowView: { type: Boolean, default: true },
      allowComment: { type: Boolean, default: false },
      allowEdit: { type: Boolean, default: false },
      allowDelete: { type: Boolean, default: false },
      allowShare: { type: Boolean, default: true },
    },
    bypassRoles: [
      {
        type: String,
        enum: ['admin', 'moderator', 'author'],
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
reputationAccessSchema.index({ content: 1, contentType: 1 }, { unique: true });
reputationAccessSchema.index({ requiredReputation: 1 });
reputationAccessSchema.index({ requiredLevel: 1 });

const ReputationAccess = mongoose.model('ReputationAccess', reputationAccessSchema);

module.exports = ReputationAccess;

