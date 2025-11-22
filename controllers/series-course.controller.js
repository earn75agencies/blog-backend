const Series = require('../models/Series.model');
const Course = require('../models/Course.model');
const CourseProgress = require('../models/CourseProgress.model');
const CourseEnrollment = require('../models/CourseEnrollment.model');
const CourseDiscussion = require('../models/CourseDiscussion.model');
const Certificate = require('../models/Certificate.model');
const Quiz = require('../models/Quiz.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Create nested series
 * @route   POST /api/series/:parentId/child
 * @access  Private
 */
exports.createChildSeries = asyncHandler(async (req, res) => {
  const { parentId } = req.params;
  const { title, description, category, tags } = req.body;

  const parentSeries = await Series.findById(parentId);
  if (!parentSeries) {
    throw new ErrorResponse('Parent series not found', 404);
  }

  // Check permissions
  if (parentSeries.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  const childSeries = await Series.create({
    title,
    description,
    author: req.user._id,
    category,
    tags,
    parentSeries: parentId,
    status: 'draft',
  });

  parentSeries.childSeries.push(childSeries._id);
  await parentSeries.save();

  res.status(201).json({
    status: 'success',
    data: { series: childSeries },
  });
});

/**
 * @desc    Schedule series posts
 * @route   POST /api/series/:id/schedule
 * @access  Private
 */
exports.scheduleSeriesPosts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { scheduledPosts } = req.body;

  const series = await Series.findById(id);
  if (!series) {
    throw new ErrorResponse('Series not found', 404);
  }

  // Check permissions
  if (series.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  series.scheduledPosts = scheduledPosts.map(sp => ({
    post: sp.post,
    scheduledFor: new Date(sp.scheduledFor),
    published: false,
  }));

  await series.save();

  res.json({
    status: 'success',
    message: 'Posts scheduled successfully',
    data: { series },
  });
});

/**
 * @desc    Get series version history
 * @route   GET /api/series/:id/versions
 * @access  Private
 */
exports.getSeriesVersions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const series = await Series.findById(id);
  if (!series) {
    throw new ErrorResponse('Series not found', 404);
  }

  res.json({
    status: 'success',
    data: { versions: series.versionHistory },
  });
});

/**
 * @desc    Enroll in course
 * @route   POST /api/courses/:id/enroll
 * @access  Private
 */
exports.enrollInCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const course = await Course.findById(id);
  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  if (course.status !== 'published') {
    throw new ErrorResponse('Course is not available', 400);
  }

  // Check enrollment limit
  if (course.enrollmentLimit && course.enrollmentCount >= course.enrollmentLimit) {
    throw new ErrorResponse('Course enrollment limit reached', 400);
  }

  // Check if already enrolled
  const existingEnrollment = await CourseEnrollment.findOne({
    user: req.user._id,
    course: id,
  });

  if (existingEnrollment) {
    throw new ErrorResponse('Already enrolled in this course', 400);
  }

  // Handle payment if paid course
  if (course.accessType === 'paid' && course.price > 0) {
    // Payment processing would go here
    // For now, just create enrollment
  }

  // Create enrollment
  const enrollment = await CourseEnrollment.create({
    user: req.user._id,
    course: id,
    accessType: course.accessType,
  });

  // Create progress tracking
  await CourseProgress.create({
    user: req.user._id,
    course: id,
    enrolledAt: new Date(),
  });

  // Update course enrollment count
  course.enrollmentCount += 1;
  await course.save();

  res.status(201).json({
    status: 'success',
    message: 'Enrolled in course successfully',
    data: { enrollment },
  });
});

/**
 * @desc    Get course progress
 * @route   GET /api/courses/:id/progress
 * @access  Private
 */
exports.getCourseProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let progress = await CourseProgress.findOne({
    user: req.user._id,
    course: id,
  });

  if (!progress) {
    // Check if enrolled
    const enrollment = await CourseEnrollment.findOne({
      user: req.user._id,
      course: id,
    });

    if (!enrollment) {
      throw new ErrorResponse('Not enrolled in this course', 403);
    }

    progress = await CourseProgress.create({
      user: req.user._id,
      course: id,
      enrolledAt: enrollment.enrolledAt,
    });
  }

  const course = await Course.findById(id);
  progress = await progress.populate('course', 'title lessons');

  res.json({
    status: 'success',
    data: { progress },
  });
});

/**
 * @desc    Complete lesson
 * @route   POST /api/courses/:id/lessons/:lessonId/complete
 * @access  Private
 */
exports.completeLesson = asyncHandler(async (req, res) => {
  const { id, lessonId } = req.params;
  const { timeSpent } = req.body;

  const progress = await CourseProgress.findOne({
    user: req.user._id,
    course: id,
  });

  if (!progress) {
    throw new ErrorResponse('Not enrolled in this course', 403);
  }

  await progress.updateProgress(lessonId, timeSpent || 0);

  // Check if course completed
  if (progress.isCompleted && !progress.certificateIssued) {
    // Issue certificate
    const certificate = await Certificate.create({
      user: req.user._id,
      course: id,
      completedAt: progress.completedAt,
      completionPercentage: 100,
    });

    progress.certificateIssued = true;
    progress.certificateId = certificate._id;
    await progress.save();
  }

  res.json({
    status: 'success',
    message: 'Lesson completed',
    data: { progress },
  });
});

/**
 * @desc    Get course discussion
 * @route   GET /api/courses/:id/discussion
 * @access  Public
 */
exports.getCourseDiscussion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lesson } = req.query;

  const query = { course: id };
  if (lesson) query.lesson = lesson;

  const discussions = await CourseDiscussion.find(query)
    .populate('author', 'username avatar')
    .populate('parentPost', 'title content')
    .sort({ isPinned: -1, createdAt: -1 });

  res.json({
    status: 'success',
    data: { discussions },
  });
});

/**
 * @desc    Create discussion post
 * @route   POST /api/courses/:id/discussion
 * @access  Private
 */
exports.createDiscussion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lesson, title, content, parentPost } = req.body;

  // Check enrollment
  const enrollment = await CourseEnrollment.findOne({
    user: req.user._id,
    course: id,
  });

  if (!enrollment && req.user.role !== 'admin') {
    throw new ErrorResponse('Must be enrolled to participate in discussions', 403);
  }

  const discussion = await CourseDiscussion.create({
    course: id,
    lesson,
    author: req.user._id,
    title,
    content,
    parentPost,
  });

  if (parentPost) {
    await CourseDiscussion.findByIdAndUpdate(parentPost, {
      $push: { replies: discussion._id },
    });
  }

  res.status(201).json({
    status: 'success',
    data: { discussion },
  });
});

/**
 * @desc    Get AI course recommendations
 * @route   GET /api/courses/recommendations
 * @access  Private
 */
exports.getCourseRecommendations = asyncHandler(async (req, res) => {
  // In production, use AI service for recommendations
  // For now, return popular courses
  const courses = await Course.find({
    status: 'published',
    isPublished: true,
  })
    .sort({ studentsCount: -1, averageRating: -1 })
    .limit(10)
    .populate('instructor', 'username avatar');

  res.json({
    status: 'success',
    data: { courses },
  });
});

