const mongoose = require('mongoose');

/**
 * Skill Tree Schema
 * For creator skill trees and unlockable content tools
 */
const skillTreeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    skills: [
      {
        skillId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        category: {
          type: String,
          enum: ['content', 'monetization', 'analytics', 'social', 'design', 'marketing'],
          required: true,
        },
        level: {
          type: Number,
          default: 0,
          min: 0,
          max: 10,
        },
        experience: {
          type: Number,
          default: 0,
        },
        requiredExperience: {
          type: Number,
          default: 100,
        },
        isUnlocked: {
          type: Boolean,
          default: false,
        },
        unlockedAt: Date,
        prerequisites: [String],
        unlocks: [
          {
            type: {
              type: String,
              enum: ['feature', 'tool', 'template', 'access'],
            },
            name: String,
            description: String,
          },
        ],
      },
    ],
    totalExperience: {
      type: Number,
      default: 0,
    },
    totalSkillsUnlocked: {
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
skillTreeSchema.index({ user: 1 }, { unique: true });
skillTreeSchema.index({ totalExperience: -1 });
skillTreeSchema.index({ totalSkillsUnlocked: -1 });

// Method to add experience
skillTreeSchema.methods.addExperience = async function (skillId, amount) {
  const skill = this.skills.find(s => s.skillId === skillId);
  if (!skill) {
    throw new Error('Skill not found');
  }

  skill.experience += amount;
  this.totalExperience += amount;

  // Check if skill can level up
  while (skill.experience >= skill.requiredExperience && skill.level < 10) {
    skill.experience -= skill.requiredExperience;
    skill.level += 1;
    skill.requiredExperience = Math.floor(skill.requiredExperience * 1.5);
    
    if (skill.level === 1 && !skill.isUnlocked) {
      skill.isUnlocked = true;
      skill.unlockedAt = new Date();
      this.totalSkillsUnlocked += 1;
    }
  }

  await this.save();
  return this;
};

// Method to unlock skill
skillTreeSchema.methods.unlockSkill = async function (skillId) {
  const skill = this.skills.find(s => s.skillId === skillId);
  if (!skill) {
    throw new Error('Skill not found');
  }

  // Check prerequisites
  for (const prereq of skill.prerequisites) {
    const prereqSkill = this.skills.find(s => s.skillId === prereq);
    if (!prereqSkill || !prereqSkill.isUnlocked) {
      throw new Error(`Prerequisite skill ${prereq} not unlocked`);
    }
  }

  if (!skill.isUnlocked) {
    skill.isUnlocked = true;
    skill.unlockedAt = new Date();
    this.totalSkillsUnlocked += 1;
    await this.save();
  }

  return this;
};

const SkillTree = mongoose.model('SkillTree', skillTreeSchema);

module.exports = SkillTree;

