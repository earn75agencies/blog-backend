const mongoose = require('mongoose');

/**
 * Achievement Schema
 * For gamification and user achievements
 */
const achievementSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Achievement name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    icon: {
      type: String,
    },
    badge: {
      type: String,
    },
    category: {
      type: String,
      enum: ['posts', 'comments', 'social', 'engagement', 'milestone', 'special'],
      required: true,
    },
    criteria: {
      type: {
        type: String,
        enum: ['posts_count', 'comments_count', 'likes_count', 'followers_count', 'views_count', 'custom'],
        required: true,
      },
      target: {
        type: Number,
        required: true,
      },
      condition: {
        type: String,
        enum: ['equals', 'greater_than', 'less_than', 'contains'],
        default: 'greater_than',
      },
    },
    points: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    earnedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        earnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    earnedCount: {
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

// Indexes
achievementSchema.index({ slug: 1 }, { unique: true });
achievementSchema.index({ category: 1, isActive: 1 });
achievementSchema.index({ rarity: 1 });
achievementSchema.index({ isActive: 1, earnedCount: -1 });
achievementSchema.index({ createdAt: -1 });

// Method to award achievement
achievementSchema.methods.awardToUser = async function (userId) {
  const existingAward = this.earnedBy.find((e) => e.user.toString() === userId.toString());
  if (!existingAward) {
    this.earnedBy.push({
      user: userId,
      earnedAt: new Date(),
    });
    this.earnedCount += 1;
    await this.save();
    return true;
  }
  return false;
};

// Pre-save middleware to generate slug
achievementSchema.pre('save', async function (next) {
  if (this.isModified('name') && !this.slug) {
    const slugify = require('../utils/string.util').slugify;
    this.slug = slugify(this.name);
  }
  next();
});

const Achievement = mongoose.model('Achievement', achievementSchema);

module.exports = Achievement;

