const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  getEventAttendees,
  getEventRegistrations,
} = require('../../../controllers/event.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');

// Public routes
router.get('/', getEvents);
router.get('/:id', getEvent);

// Protected routes
router.use(authenticate);

router.post('/', authorize('author', 'admin'), createEvent);
router.put('/:id', authorize('author', 'admin'), updateEvent);
router.delete('/:id', authorize('author', 'admin'), deleteEvent);
router.post('/:id/register', registerForEvent);
router.delete('/:id/register', cancelRegistration);
router.get('/:id/attendees', getEventAttendees);
router.get('/:id/registrations', authorize('author', 'admin'), getEventRegistrations);

module.exports = router;

