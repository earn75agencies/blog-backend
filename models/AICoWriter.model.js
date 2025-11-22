const mongoose = require('mongoose');

/**
 * AI Co-Writer Schema
 * For AI-assisted writing with style adaptation
 */
const aiCoWriterSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    writingStyle: {
      tone: {
        type: String,
        enum: ['formal', 'casual', 'professional', 'creative', 'academic', 'conversational'],
        default: 'professional',
      },
      voice: {
        type: String,
        maxlength: [500, 'Voice description cannot exceed 500 characters'],
      },
      preferences: {
        sentenceLength: {
          type: String,
          enum: ['short', 'medium', 'long', 'varied'],
          default: 'varied',
        },
        vocabulary: {
          type: String,
          enum: ['simple', 'moderate', 'advanced', 'technical'],
          default: 'moderate',
        },
        structure: {
          type: String,
          enum: ['linear', 'narrative', 'analytical', 'persuasive'],
          default: 'linear',
        },
      },
    },
    aiSuggestions: [
      {
        type: {
          type: String,
          enum: ['word', 'phrase', 'sentence', 'paragraph', 'structure'],
        },
        original: String,
        suggestion: String,
        confidence: {
          type: Number,
          min: 0,
          max: 1,
        },
        reason: String,
        accepted: {
          type: Boolean,
          default: false,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    learningData: {
      acceptedSuggestions: { type: Number, default: 0 },
      rejectedSuggestions: { type: Number, default: 0 },
      averageConfidence: { type: Number, default: 0 },
      styleAccuracy: { type: Number, default: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
aiCoWriterSchema.index({ author: 1 }, { unique: true });
aiCoWriterSchema.index({ isActive: 1 });

// Method to update learning data
aiCoWriterSchema.methods.updateLearning = async function (accepted, confidence) {
  if (accepted) {
    this.learningData.acceptedSuggestions += 1;
  } else {
    this.learningData.rejectedSuggestions += 1;
  }
  
  const total = this.learningData.acceptedSuggestions + this.learningData.rejectedSuggestions;
  if (total > 0) {
    this.learningData.averageConfidence = 
      ((this.learningData.averageConfidence * (total - 1)) + confidence) / total;
    this.learningData.styleAccuracy = 
      (this.learningData.acceptedSuggestions / total) * 100;
  }
  
  await this.save();
  return this;
};

const AICoWriter = mongoose.model('AICoWriter', aiCoWriterSchema);

module.exports = AICoWriter;

