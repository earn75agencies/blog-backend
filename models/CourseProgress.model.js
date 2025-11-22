const mongoose = require('mongoose');

/**
 * Course Progress Schema
 * For tracking individual user progress through courses
 */
const courseProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedLessons: [
      {
        lessonId: mongoose.Schema.Types.ObjectId,
        completedAt: Date,
        timeSpent: Number, // in minutes
        score: Number,
      },
    ],
    currentLesson: {
      type: mongoose.Schema.Types.ObjectId,
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    timeSpent: {
      type: Number,
      default: 0, // in minutes
    },
    quizScores: [
      {
        quizId: mongoose.Schema.Types.ObjectId,
        score: Number,
        percentage: Number,
        passed: Boolean,
        attempts: Number,
        bestScore: Number,
      },
    ],
    assignments: [
      {
        assignmentId: mongoose.Schema.Types.ObjectId,
        submitted: { type: Boolean, default: false },
        submittedAt: Date,
        grade: Number,
        feedback: String,
      },
    ],
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: Date,
    certificateIssued: {
      type: Boolean,
      default: false,
    },
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
    },
    // Personalized learning path
    learningPath: [
      {
        lessonId: mongoose.Schema.Types.ObjectId,
        order: Number,
        unlocked: { type: Boolean, default: false },
        unlockedAt: Date,
        recommended: { type: Boolean, default: false },
      },
    ],
    // Performance tracking
    performance: {
      averageScore: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0 },
      earnedPoints: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      lastActivity: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
courseProgressSchema.index({ user: 1, course: 1 }, { unique: true });
courseProgressSchema.index({ user: 1, progress: -1 });
courseProgressSchema.index({ course: 1, progress: -1 });
courseProgressSchema.index({ isCompleted: 1, completedAt: -1 });

// Method to update progress
courseProgressSchema.methods.updateProgress = async function (lessonId, timeSpent = 0) {
  const lessonCompleted = this.completedLessons.find(
    l => l.lessonId.toString() === lessonId.toString()
  );

  if (!lessonCompleted) {
    this.completedLessons.push({
      lessonId,
      completedAt: new Date(),
      timeSpent,
    });
  } else {
    lessonCompleted.timeSpent += timeSpent;
  }

  // Calculate overall progress
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.course);
  const totalLessons = course.lessons.filter(l => l.isPublished).length;
  
  if (totalLessons > 0) {
    this.progress = Math.round((this.completedLessons.length / totalLessons) * 100);
  }

  this.timeSpent += timeSpent;
  this.lastAccessed = new Date();
  this.currentLesson = lessonId;

  if (this.progress >= 100 && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  }

  await this.save();
  return this;
};

const CourseProgress = mongoose.model('CourseProgress', courseProgressSchema);

module.exports = CourseProgress;

