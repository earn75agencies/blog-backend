const mongoose = require('mongoose');

/**
 * Streak Schema
 * For achievement streak tracking
 */
const streakSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['daily-login', 'daily-post', 'daily-comment', 'weekly-engagement', 'monthly-content'],
      required: true,
      index: true,
    },
    current: {
      type: Number,
      default: 0,
    },
    longest: {
      type: Number,
      default: 0,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    milestones: [
      {
        days: Number,
        achievedAt: Date,
        reward: {
          type: String,
          enum: ['badge', 'points', 'tokens', 'feature'],
        },
        rewardAmount: Number,
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
streakSchema.index({ user: 1, type: 1 }, { unique: true });
streakSchema.index({ current: -1 });
streakSchema.index({ longest: -1 });

// Method to update streak
streakSchema.methods.updateStreak = async function () {
  const now = new Date();
  const lastActivity = new Date(this.lastActivity);
  const daysDiff = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 1) {
    // Continue streak
    this.current += 1;
    this.lastActivity = now;
    
    if (this.current > this.longest) {
      this.longest = this.current;
    }
    
    // Check for milestones
    const milestones = [7, 30, 60, 90, 180, 365];
    if (milestones.includes(this.current)) {
      const existingMilestone = this.milestones.find(m => m.days === this.current);
      if (!existingMilestone) {
        this.milestones.push({
          days: this.current,
          achievedAt: now,
          reward: 'badge',
          rewardAmount: this.current,
        });
      }
    }
  } else if (daysDiff > 1) {
    // Streak broken
    this.current = 1;
    this.lastActivity = now;
  }
  // If daysDiff === 0, same day, don't update
  
  await this.save();
  return this;
};

const Streak = mongoose.model('Streak', streakSchema);

module.exports = Streak;

