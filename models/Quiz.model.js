const mongoose = require('mongoose');

/**
 * Quiz Schema
 * For course quizzes and assessments
 */
const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      index: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    questions: [
      {
        question: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['multiple_choice', 'true_false', 'short_answer', 'essay'],
          default: 'multiple_choice',
        },
        options: [
          {
            text: String,
            isCorrect: Boolean,
          },
        ],
        correctAnswer: String,
        points: {
          type: Number,
          default: 1,
        },
        explanation: {
          type: String,
          maxlength: [500, 'Explanation cannot exceed 500 characters'],
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    passingScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    timeLimit: {
      type: Number, // in minutes
      default: 0, // 0 means no limit
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    attempts: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        answers: [
          {
            questionId: mongoose.Schema.Types.ObjectId,
            answer: mongoose.Schema.Types.Mixed,
            isCorrect: Boolean,
            points: Number,
          },
        ],
        score: {
          type: Number,
          default: 0,
        },
        percentage: {
          type: Number,
          default: 0,
        },
        passed: {
          type: Boolean,
          default: false,
        },
        startedAt: {
          type: Date,
        },
        completedAt: {
          type: Date,
        },
        timeTaken: {
          type: Number, // in seconds
        },
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
quizSchema.index({ course: 1, createdAt: -1 });
quizSchema.index({ lesson: 1 });
quizSchema.index({ isPublished: 1, createdAt: -1 });
quizSchema.index({ createdAt: -1 });

// Virtual for total points
quizSchema.virtual('totalPoints').get(function () {
  return this.questions.reduce((total, question) => total + (question.points || 1), 0);
});

// Method to grade quiz attempt
quizSchema.methods.gradeAttempt = async function (attemptIndex) {
  const attempt = this.attempts[attemptIndex];
  if (!attempt) return null;

  let score = 0;
  let correctAnswers = 0;

  attempt.answers.forEach((answer) => {
    const question = this.questions.id(answer.questionId);
    if (question) {
      let isCorrect = false;
      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        isCorrect = question.options.some(
          (opt, index) => opt.isCorrect && answer.answer === index
        );
      } else {
        isCorrect = answer.answer?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
      }

      answer.isCorrect = isCorrect;
      answer.points = isCorrect ? (question.points || 1) : 0;
      score += answer.points;
      if (isCorrect) correctAnswers += 1;
    }
  });

  attempt.score = score;
  attempt.percentage = Math.round((score / this.totalPoints) * 100);
  attempt.passed = attempt.percentage >= this.passingScore;
  attempt.completedAt = new Date();

  await this.save();
  return attempt;
};

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;

