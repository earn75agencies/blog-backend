const express = require('express');
const router = express.Router();
const {
  createChildSeries,
  scheduleSeriesPosts,
  getSeriesVersions,
  enrollInCourse,
  getCourseProgress,
  completeLesson,
  getCourseDiscussion,
  createDiscussion,
  getCourseRecommendations,
} = require('../controllers/series-course.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/series/:parentId/child', createChildSeries);
router.post('/series/:id/schedule', scheduleSeriesPosts);
router.get('/series/:id/versions', getSeriesVersions);
router.post('/courses/:id/enroll', enrollInCourse);
router.get('/courses/:id/progress', getCourseProgress);
router.post('/courses/:id/lessons/:lessonId/complete', completeLesson);
router.get('/courses/:id/discussion', getCourseDiscussion);
router.post('/courses/:id/discussion', createDiscussion);
router.get('/courses/recommendations', getCourseRecommendations);

module.exports = router;

