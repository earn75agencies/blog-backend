const Course = require('../models/Course.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const CacheUtil = require('../utils/cache.util');

/**
 * @desc    Get all courses
 * @route   GET /api/courses
 * @access  Public
 */
exports.getCourses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { status: 'published', isPublished: true };

  if (req.query.instructor) {
    query.instructor = req.query.instructor;
  }
  if (req.query.category) {
    query.category = req.query.category;
  }
  if (req.query.tag) {
    query.tags = req.query.tag;
  }
  if (req.query.level) {
    query.level = req.query.level;
  }
  if (req.query.language) {
    query.language = req.query.language;
  }
  if (req.query.featured) {
    query.isFeatured = req.query.featured === 'true';
  }
  if (req.query.priceMin) {
    query.price = { ...query.price, $gte: parseFloat(req.query.priceMin) };
  }
  if (req.query.priceMax) {
    query.price = { ...query.price, $lte: parseFloat(req.query.priceMax) };
  }

  const sortBy = req.query.sortBy || 'publishedAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const courses = await Course.find(query)
    .populate('instructor', 'username avatar firstName lastName bio')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });

  const total = await Course.countDocuments(query);

  res.json({
    status: 'success',
    results: courses.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      courses,
    },
  });
});

/**
 * @desc    Get single course
 * @route   GET /api/courses/:slug
 * @access  Public
 */
exports.getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug })
    .populate('instructor', 'username avatar firstName lastName bio')
    .populate('category', 'name slug description')
    .populate('tags', 'name slug')
    .populate('lessons.post', 'title slug excerpt featuredImage publishedAt');

  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  if (course.status !== 'published' && (!req.user || (req.user._id.toString() !== course.instructor._id.toString() && req.user.role !== 'admin'))) {
    throw new ErrorResponse('Course not found', 404);
  }

  // Check if user is enrolled
  let isEnrolled = false;
  let studentProgress = null;
  if (req.user) {
    const student = course.students.find((s) => s.user.toString() === req.user._id.toString());
    if (student) {
      isEnrolled = true;
      studentProgress = student;
    }
  }

  await course.incrementViews();

  res.json({
    status: 'success',
    data: {
      course: {
        ...course.toObject(),
        isEnrolled,
        studentProgress,
      },
    },
  });
});

/**
 * @desc    Create course
 * @route   POST /api/courses
 * @access  Private/Author
 */
exports.createCourse = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    tags,
    price,
    currency,
    originalPrice,
    discount,
    level,
    language,
    featuredImage,
    thumbnail,
    requirements,
    whatYouWillLearn,
    seoTitle,
    seoDescription,
    seoKeywords,
  } = req.body;

  const course = await Course.create({
    title,
    description,
    instructor: req.user._id,
    category,
    tags: tags || [],
    price: price || 0,
    currency: currency || 'USD',
    originalPrice,
    discount: discount || 0,
    level: level || 'beginner',
    language: language || 'en',
    featuredImage,
    thumbnail,
    requirements: requirements || [],
    whatYouWillLearn: whatYouWillLearn || [],
    seoTitle,
    seoDescription,
    seoKeywords: seoKeywords ? (Array.isArray(seoKeywords) ? seoKeywords : seoKeywords.split(',')) : [],
    status: 'draft',
  });

  const populatedCourse = await Course.findById(course._id)
    .populate('instructor', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug');

  res.status(201).json({
    status: 'success',
    message: 'Course created successfully',
    data: {
      course: populatedCourse,
    },
  });
});

/**
 * @desc    Update course
 * @route   PUT /api/courses/:id
 * @access  Private/Author
 */
exports.updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this course', 403);
  }

  const updateFields = [
    'title', 'description', 'category', 'tags', 'price', 'currency',
    'originalPrice', 'discount', 'level', 'language', 'featuredImage',
    'thumbnail', 'requirements', 'whatYouWillLearn', 'seoTitle',
    'seoDescription', 'seoKeywords', 'status',
  ];

  updateFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === 'tags' || field === 'requirements' || field === 'whatYouWillLearn' || field === 'seoKeywords') {
        course[field] = Array.isArray(req.body[field])
          ? req.body[field]
          : req.body[field].split(',');
      } else {
        course[field] = req.body[field];
      }
    }
  });

  await course.save();
  await course.calculateTotalDuration();

  const updatedCourse = await Course.findById(course._id)
    .populate('instructor', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug');

  res.json({
    status: 'success',
    message: 'Course updated successfully',
    data: {
      course: updatedCourse,
    },
  });
});

/**
 * @desc    Delete course
 * @route   DELETE /api/courses/:id
 * @access  Private/Author
 */
exports.deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to delete this course', 403);
  }

  await course.remove();

  res.json({
    status: 'success',
    message: 'Course deleted successfully',
  });
});

/**
 * @desc    Add lesson to course
 * @route   POST /api/courses/:id/lessons
 * @access  Private/Author
 */
exports.addLesson = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to modify this course', 403);
  }

  const { title, content, post, duration, resources } = req.body;

  await course.addLesson({
    title,
    content,
    post,
    duration: duration || 0,
    resources: resources || [],
  });

  const updatedCourse = await Course.findById(course._id);

  res.json({
    status: 'success',
    message: 'Lesson added successfully',
    data: {
      course: updatedCourse,
    },
  });
});

/**
 * @desc    Update lesson
 * @route   PUT /api/courses/:id/lessons/:lessonId
 * @access  Private/Author
 */
exports.updateLesson = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to modify this course', 403);
  }

  await course.updateLesson(req.params.lessonId, req.body);

  const updatedCourse = await Course.findById(course._id);

  res.json({
    status: 'success',
    message: 'Lesson updated successfully',
    data: {
      course: updatedCourse,
    },
  });
});

/**
 * @desc    Remove lesson
 * @route   DELETE /api/courses/:id/lessons/:lessonId
 * @access  Private/Author
 */
exports.removeLesson = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to modify this course', 403);
  }

  await course.removeLesson(req.params.lessonId);

  res.json({
    status: 'success',
    message: 'Lesson removed successfully',
    data: {
      course,
    },
  });
});

/**
 * @desc    Enroll in course
 * @route   POST /api/courses/:id/enroll
 * @access  Private
 */
exports.enrollInCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  if (course.price > 0) {
    // Handle payment logic here
    // For now, just check if user has access
    throw new ErrorResponse('This is a paid course. Payment required.', 402);
  }

  await course.enrollStudent(req.user._id);

  res.json({
    status: 'success',
    message: 'Enrolled in course successfully',
    data: {
      course,
    },
  });
});

/**
 * @desc    Update course progress
 * @route   PUT /api/courses/:id/progress
 * @access  Private
 */
exports.updateProgress = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  const { lessonId } = req.body;

  await course.updateStudentProgress(req.user._id, lessonId);

  const student = course.students.find((s) => s.user.toString() === req.user._id.toString());

  res.json({
    status: 'success',
    message: 'Progress updated successfully',
    data: {
      progress: student,
    },
  });
});

/**
 * @desc    Add course rating
 * @route   POST /api/courses/:id/rate
 * @access  Private
 */
exports.rateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ErrorResponse('Rating must be between 1 and 5', 400);
  }

  await course.addRating(req.user._id, rating, review);

  const updatedCourse = await Course.findById(course._id);

  res.json({
    status: 'success',
    message: 'Rating added successfully',
    data: {
      course: updatedCourse,
    },
  });
});

/**
 * @desc    Get featured courses
 * @route   GET /api/courses/featured
 * @access  Public
 */
exports.getFeaturedCourses = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  const cacheKey = `courses:featured:${limit}`;
  let courses = CacheUtil.get(cacheKey);

  if (!courses) {
    courses = await Course.find({
      status: 'published',
      isPublished: true,
      isFeatured: true,
    })
      .populate('instructor', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .limit(limit)
      .sort({ publishedAt: -1 });

    CacheUtil.set(cacheKey, courses, 600); // Cache for 10 minutes
  }

  res.json({
    status: 'success',
    results: courses.length,
    data: {
      courses,
    },
  });
});

