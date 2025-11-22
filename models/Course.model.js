const mongoose = require('mongoose');

/**
 * Course Schema
 * For creating structured learning courses
 */
const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lessons: [
      {
        title: {
          type: String,
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        post: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Post',
        },
        order: {
          type: Number,
          default: 0,
        },
        duration: {
          type: Number, // in minutes
          default: 0,
        },
        isPublished: {
          type: Boolean,
          default: false,
        },
        resources: [
          {
            title: String,
            url: String,
            type: {
              type: String,
              enum: ['video', 'pdf', 'link', 'file'],
            },
          },
        ],
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    featuredImage: {
      type: String,
    },
    thumbnail: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    originalPrice: {
      type: Number,
    },
    discount: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner',
    },
    language: {
      type: String,
      default: 'en',
    },
    totalDuration: {
      type: Number, // in minutes
      default: 0,
    },
    students: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
        progress: {
          type: Number,
          default: 0,
        },
        completedLessons: [
          {
            type: mongoose.Schema.Types.ObjectId,
          },
        ],
        certificateIssued: {
          type: Boolean,
          default: false,
        },
        certificateIssuedAt: {
          type: Date,
        },
      },
    ],
    studentsCount: {
      type: Number,
      default: 0,
    },
    ratings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        review: {
          type: String,
          maxlength: [1000, 'Review cannot exceed 1000 characters'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    certificateTemplate: {
      type: String,
    },
    requirements: [String],
    whatYouWillLearn: [String],
    seoTitle: {
      type: String,
      maxlength: [70, 'SEO title cannot exceed 70 characters'],
    },
    seoDescription: {
      type: String,
      maxlength: [160, 'SEO description cannot exceed 160 characters'],
    },
    seoKeywords: [String],
    // Enhanced lesson formats
    lessons: [
      {
        title: {
          type: String,
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        post: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Post',
        },
        order: {
          type: Number,
          default: 0,
        },
        duration: {
          type: Number, // in minutes
          default: 0,
        },
        format: {
          type: String,
          enum: ['text', 'video', 'audio', 'vr', 'ar', 'interactive', 'quiz'],
          default: 'text',
        },
        videoUrl: String,
        audioUrl: String,
        vrContentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'VRContent',
        },
        isPublished: {
          type: Boolean,
          default: false,
        },
        resources: [
          {
            title: String,
            url: String,
            type: {
              type: String,
              enum: ['video', 'pdf', 'link', 'file', 'code'],
            },
          },
        ],
        // Drip content
        dripSchedule: {
          enabled: { type: Boolean, default: false },
          daysAfterEnrollment: Number,
          unlockDate: Date,
        },
        // Prerequisites
        prerequisites: [
          {
            type: mongoose.Schema.Types.ObjectId,
          },
        ],
        // Quizzes
        quiz: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Quiz',
        },
        // Assignments
        assignments: [
          {
            title: String,
            description: String,
            dueDate: Date,
            submissions: [
              {
                user: mongoose.Schema.Types.ObjectId,
                submittedAt: Date,
                content: String,
                grade: Number,
              },
            ],
          },
        ],
        // Discussion
        discussionEnabled: {
          type: Boolean,
          default: true,
        },
        // Accessibility
        accessibility: {
          captions: { type: Boolean, default: false },
          transcripts: { type: Boolean, default: false },
          screenReader: { type: Boolean, default: false },
        },
        // Localization
        translations: [
          {
            language: String,
            title: String,
            content: String,
          },
        ],
        // Versioning
        version: {
          type: Number,
          default: 1,
        },
        versionHistory: [
          {
            version: Number,
            content: String,
            changedAt: Date,
            changedBy: mongoose.Schema.Types.ObjectId,
          },
        ],
      },
    ],
    // Multi-author
    instructors: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['instructor', 'co-instructor', 'assistant'],
          default: 'instructor',
        },
      },
    ],
    // Enrollment
    enrollmentLimit: {
      type: Number,
    },
    enrollmentCount: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    // Access control
    accessType: {
      type: String,
      enum: ['free', 'paid', 'subscription', 'invite-only'],
      default: 'free',
    },
    // Gamification
    achievements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Achievement',
      },
    ],
    // Social sharing
    shareCount: {
      type: Number,
      default: 0,
    },
    // AI features
    aiRecommended: {
      type: Boolean,
      default: false,
    },
    personalizedLearningPath: {
      type: Boolean,
      default: false,
    },
    // Analytics
    analytics: {
      enrollmentRate: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      averageProgress: { type: Number, default: 0 },
      engagementScore: { type: Number, default: 0 },
      lessonMetrics: [
        {
          lessonId: mongoose.Schema.Types.ObjectId,
          views: { type: Number, default: 0 },
          completions: { type: Number, default: 0 },
          averageTime: { type: Number, default: 0 },
        },
      ],
    },
    // Bundling
    bundleCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    isBundle: {
      type: Boolean,
      default: false,
    },
    // Affiliate
    affiliateEnabled: {
      type: Boolean,
      default: false,
    },
    affiliateCommission: {
      type: Number,
      default: 0,
    },
    // Dynamic pricing
    dynamicPricing: {
      enabled: { type: Boolean, default: false },
      basePrice: Number,
      factors: {
        demand: { type: Number, default: 1 },
        time: { type: Number, default: 1 },
        userSegment: { type: Number, default: 1 },
      },
    },
    // Blockchain verification
    blockchainVerification: {
      enabled: { type: Boolean, default: false },
      contractAddress: String,
      blockchain: String,
    },
    // Import/Export
    importSource: String,
    exportFormat: {
      type: String,
      enum: ['json', 'xml', 'scorm', 'xapi'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
courseSchema.index({ slug: 1 }, { unique: true });
courseSchema.index({ instructor: 1, createdAt: -1 });
courseSchema.index({ status: 1, publishedAt: -1 });
courseSchema.index({ isPublished: 1, publishedAt: -1 });
courseSchema.index({ isFeatured: 1, publishedAt: -1 });
courseSchema.index({ category: 1, status: 1 });
courseSchema.index({ level: 1, status: 1 });
courseSchema.index({ language: 1, status: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ averageRating: -1 });
courseSchema.index({ studentsCount: -1 });
courseSchema.index({ views: -1 });
courseSchema.index({ createdAt: -1 });

// Virtual for lessons count
courseSchema.virtual('lessonsCount').get(function () {
  return this.lessons ? this.lessons.length : 0;
});

// Virtual for total lessons
courseSchema.virtual('totalLessons').get(function () {
  return this.lessons ? this.lessons.filter((l) => l.isPublished).length : 0;
});

// Method to add lesson
courseSchema.methods.addLesson = async function (lessonData) {
  const order = this.lessons.length;
  this.lessons.push({
    ...lessonData,
    order: lessonData.order !== undefined ? lessonData.order : order,
  });
  await this.calculateTotalDuration();
  await this.save();
  return this;
};

// Method to update lesson
courseSchema.methods.updateLesson = async function (lessonId, lessonData) {
  const lesson = this.lessons.id(lessonId);
  if (lesson) {
    Object.assign(lesson, lessonData);
    await this.calculateTotalDuration();
    await this.save();
  }
  return this;
};

// Method to remove lesson
courseSchema.methods.removeLesson = async function (lessonId) {
  this.lessons = this.lessons.filter((l) => l._id.toString() !== lessonId.toString());
  await this.calculateTotalDuration();
  await this.save();
  return this;
};

// Method to calculate total duration
courseSchema.methods.calculateTotalDuration = async function () {
  this.totalDuration = this.lessons.reduce((total, lesson) => {
    return total + (lesson.duration || 0);
  }, 0);
  return this.totalDuration;
};

// Method to enroll student
courseSchema.methods.enrollStudent = async function (userId) {
  const existingEnrollment = this.students.find(
    (s) => s.user.toString() === userId.toString()
  );
  if (!existingEnrollment) {
    this.students.push({
      user: userId,
      enrolledAt: new Date(),
      progress: 0,
      completedLessons: [],
    });
    this.studentsCount += 1;
    await this.save();
  }
  return this;
};

// Method to update student progress
courseSchema.methods.updateStudentProgress = async function (userId, lessonId) {
  const student = this.students.find((s) => s.user.toString() === userId.toString());
  if (student && !student.completedLessons.includes(lessonId)) {
    student.completedLessons.push(lessonId);
    const totalLessons = this.lessons.filter((l) => l.isPublished).length;
    student.progress = Math.round((student.completedLessons.length / totalLessons) * 100);
    await this.save();
  }
  return this;
};

// Method to add rating
courseSchema.methods.addRating = async function (userId, rating, review) {
  const existingRating = this.ratings.find((r) => r.user.toString() === userId.toString());
  if (existingRating) {
    existingRating.rating = rating;
    existingRating.review = review;
  } else {
    this.ratings.push({
      user: userId,
      rating,
      review,
    });
    this.ratingsCount += 1;
  }
  await this.calculateAverageRating();
  await this.save();
  return this;
};

// Method to calculate average rating
courseSchema.methods.calculateAverageRating = async function () {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    return 0;
  }
  const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
  this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
  return this.averageRating;
};

// Method to increment views
courseSchema.methods.incrementViews = async function () {
  this.views += 1;
  await this.save();
  return this;
};

// Pre-save middleware to generate slug
courseSchema.pre('save', async function (next) {
  if (this.isModified('title') && !this.slug) {
    const slugify = require('../utils/string.util').slugify;
    let slug = slugify(this.title);
    let existingCourse = await mongoose.model('Course').findOne({ slug });
    let counter = 1;
    while (existingCourse) {
      slug = `${slugify(this.title)}-${counter}`;
      existingCourse = await mongoose.model('Course').findOne({ slug });
      counter++;
    }
    this.slug = slug;
  }
  next();
});

// Pre-save middleware to set publishedAt
courseSchema.pre('save', async function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
    this.isPublished = true;
  }
  if (this.status !== 'published') {
    this.isPublished = false;
  }
  next();
});

// Pre-save middleware to calculate price with discount
courseSchema.pre('save', function (next) {
  if (this.isModified('price') || this.isModified('discount') || this.isModified('originalPrice')) {
    if (this.originalPrice && this.discount > 0) {
      this.price = this.originalPrice * (1 - this.discount / 100);
    } else if (this.originalPrice && !this.price) {
      this.price = this.originalPrice;
    }
  }
  next();
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;

