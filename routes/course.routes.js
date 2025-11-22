const express = require('express');
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  addLesson,
  updateLesson,
  removeLesson,
  enrollInCourse,
  updateProgress,
  rateCourse,
  getFeaturedCourses,
} = require('../controllers/course.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getCourses);
router.get('/featured', optionalAuth, getFeaturedCourses);
router.get('/:slug', optionalAuth, getCourse);

// Protected routes
router.post('/', authenticate, authorize('author', 'admin'), createCourse);
router.put('/:id', authenticate, authorize('author', 'admin'), updateCourse);
router.delete('/:id', authenticate, authorize('author', 'admin'), deleteCourse);
router.post('/:id/lessons', authenticate, authorize('author', 'admin'), addLesson);
router.put('/:id/lessons/:lessonId', authenticate, authorize('author', 'admin'), updateLesson);
router.delete('/:id/lessons/:lessonId', authenticate, authorize('author', 'admin'), removeLesson);
router.post('/:id/enroll', authenticate, enrollInCourse);
router.put('/:id/progress', authenticate, updateProgress);
router.post('/:id/rate', authenticate, rateCourse);

module.exports = router;

