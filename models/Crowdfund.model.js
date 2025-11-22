const mongoose = require('mongoose');

/**
 * Crowdfunding Campaign Schema
 * For fundraising campaigns
 */
const crowdfundSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Campaign title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
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
      required: [true, 'Campaign description is required'],
      maxlength: [10000, 'Description cannot exceed 10000 characters'],
    },
    goal: {
      type: Number,
      required: [true, 'Funding goal is required'],
      min: [1, 'Goal must be at least 1'],
    },
    raised: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    backers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        amount: {
          type: Number,
          required: true,
        },
        pledgedAt: {
          type: Date,
          default: Date.now,
        },
        reward: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'CrowdfundReward',
        },
        isAnonymous: {
          type: Boolean,
          default: false,
        },
      },
    ],
    backersCount: {
      type: Number,
      default: 0,
    },
    rewards: [
      {
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
        },
        amount: {
          type: Number,
          required: true,
        },
        limit: {
          type: Number,
        },
        claimed: {
          type: Number,
          default: 0,
        },
      },
    ],
    images: [String],
    featuredImage: {
      type: String,
    },
    video: {
      type: String,
    },
    category: {
      type: String,
      enum: ['tech', 'creative', 'business', 'education', 'health', 'other'],
    },
    tags: [String],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'active', 'funded', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    updates: [
      {
        title: String,
        content: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    faq: [
      {
        question: String,
        answer: String,
      },
    ],
    seoTitle: {
      type: String,
      maxlength: [70, 'SEO title cannot exceed 70 characters'],
    },
    seoDescription: {
      type: String,
      maxlength: [160, 'SEO description cannot exceed 160 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
crowdfundSchema.index({ slug: 1 }, { unique: true });
crowdfundSchema.index({ creator: 1, createdAt: -1 });
crowdfundSchema.index({ status: 1, endDate: 1 });
crowdfundSchema.index({ category: 1, status: 1 });
crowdfundSchema.index({ raised: -1 });
crowdfundSchema.index({ backersCount: -1 });
crowdfundSchema.index({ createdAt: -1 });

// Virtual for progress percentage
crowdfundSchema.virtual('progress').get(function () {
  return Math.min(100, Math.round((this.raised / this.goal) * 100));
});

// Virtual for days remaining
crowdfundSchema.virtual('daysRemaining').get(function () {
  const now = new Date();
  if (now > this.endDate) return 0;
  const diff = this.endDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Method to add backer
crowdfundSchema.methods.addBacker = async function (userId, amount, reward = null, isAnonymous = false) {
  this.backers.push({
    user: userId,
    amount,
    pledgedAt: new Date(),
    reward,
    isAnonymous,
  });
  this.raised += amount;
  this.backersCount += 1;
  
  if (reward) {
    const rewardObj = this.rewards.id(reward);
    if (rewardObj) {
      rewardObj.claimed += 1;
    }
  }
  
  if (this.raised >= this.goal && this.status === 'active') {
    this.status = 'funded';
  }
  
  await this.save();
  return this;
};

// Pre-save middleware to generate slug
crowdfundSchema.pre('save', async function (next) {
  if (this.isModified('title') && !this.slug) {
    const slugify = require('../utils/string.util').slugify;
    let slug = slugify(this.title);
    let existingCampaign = await mongoose.model('Crowdfund').findOne({ slug });
    let counter = 1;
    
    while (existingCampaign) {
      slug = `${slugify(this.title)}-${counter}`;
      existingCampaign = await mongoose.model('Crowdfund').findOne({ slug });
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

const Crowdfund = mongoose.model('Crowdfund', crowdfundSchema);

module.exports = Crowdfund;

