const Event = require('../models/Event.model');

/**
 * Get events with filters
 */
exports.getEvents = async (filters = {}, options = {}) => {
  const { page = 1, limit = 10, sort = { date: 1 } } = options;

  const events = await Event.find(filters)
    .populate('organizer', 'username avatar')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  const count = await Event.countDocuments(filters);

  return {
    events,
    currentPage: page,
    totalPages: Math.ceil(count / limit),
    totalEvents: count,
  };
};

/**
 * Create event
 */
exports.createEvent = async (eventData) => {
  const event = await Event.create(eventData);
  return event;
};

/**
 * Update event
 */
exports.updateEvent = async (eventId, updates) => {
  const event = await Event.findByIdAndUpdate(
    eventId,
    updates,
    { new: true, runValidators: true }
  );

  if (!event) {
    throw new Error('Event not found');
  }

  return event;
};

/**
 * Register for event
 */
exports.registerForEvent = async (eventId, userId) => {
  const event = await Event.findById(eventId);
  
  if (!event) {
    throw new Error('Event not found');
  }

  if (event.attendees.includes(userId)) {
    throw new Error('Already registered');
  }

  if (event.maxAttendees && event.attendeesCount >= event.maxAttendees) {
    throw new Error('Event is full');
  }

  event.attendees.push(userId);
  event.attendeesCount = event.attendees.length;
  await event.save();

  return event;
};

