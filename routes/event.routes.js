const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelEventRegistration,
} = require('../controllers/event.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.route('/')
  .get(getEvents)
  .post(authenticate, createEvent);

router.route('/:id')
  .get(getEvent)
  .put(authenticate, updateEvent)
  .delete(authenticate, deleteEvent);

router.route('/:id/register')
  .post(authenticate, registerForEvent)
  .delete(authenticate, cancelEventRegistration);

module.exports = router;

