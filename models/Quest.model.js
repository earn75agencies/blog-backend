const mongoose = require('mongoose');

/**
 * Quest Schema
 * For gamified quests and challenges
 */
const questSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Quest name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
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
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'seasonal', 'event', 'special'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['content', 'engagement', 'social', 'monetization', 'learning', 'other'],
      required: true,
    },
    objectives: [
      {
        type: {
          type: String,
          enum: ['create-post', 'get-likes', 'get-comments', 'share', 'follow', 'complete-course', 'custom'],
          required: true,
        },
        target: {
          type: Number,
          required: true,
        },
        current: {
          type: Number,
          default: 0,
        },
        description: String,
      },
    ],
    rewards: {
      tokens: { type: Number, default: 0 },
      badges: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Badge',
        },
      ],
      achievements: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Achievement',
        },
      ],
      points: { type: Number, default: 0 },
      unlockables: [String],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        progress: {
          type: Map,
          of: Number,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
        rewardsClaimed: {
          type: Boolean,
          default: false,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    participantsCount: {
      type: Number,
      default: 0,
    },
    completionsCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
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
questSchema.index({ slug: 1 }, { unique: true });
questSchema.index({ type: 1, isActive: 1, startDate: 1, endDate: 1 });
questSchema.index({ category: 1, isActive: 1 });
questSchema.index({ isFeatured: 1, startDate: -1 });
questSchema.index({ participantsCount: -1 });
questSchema.index({ createdAt: -1 });

// Pre-save middleware to generate slug
questSchema.pre('save', async function (next) {
  if (this.isModified('name') && !this.slug) {
    const slugify = require('../utils/string.util').slugify;
    let slug = slugify(this.name);
    let existingQuest = await mongoose.model('Quest').findOne({ slug });
    let counter = 1;
    
    while (existingQuest) {
      slug = `${slugify(this.name)}-${counter}`;
      existingQuest = await mongoose.model('Quest').findOne({ slug });
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

const Quest = mongoose.model('Quest', questSchema);

module.exports = Quest;

