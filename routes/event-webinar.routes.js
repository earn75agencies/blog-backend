const express = require('express');
const router = express.Router();
const {
  createEvent,
  createWebinar,
  getEvents,
  getWebinars,
  registerForEvent,
  createTicket,
  purchaseTicket,
} = require('../controllers/event-webinar.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/events', authenticate, createEvent);
router.get('/events', getEvents);
router.post('/events/:id/register', authenticate, registerForEvent);
router.post('/events/:id/tickets', authenticate, createTicket);
router.post('/webinars', authenticate, createWebinar);
router.get('/webinars', getWebinars);
router.post('/tickets/:id/purchase', authenticate, purchaseTicket);

module.exports = router;

