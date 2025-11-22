const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const Event = require('../models/Event.model');

/**
 * @desc    Get all events
 * @route   GET /api/events
 * @access  Public
 */
exports.getEvents = asyncHandler(async (req, res) => {
  const { status, category, page = 1, limit = 10 } = req.query;
  
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;

  const events = await Event.find(query)
    .populate('organizer', 'username avatar')
    .sort({ date: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  const count = await Event.countDocuments(query);

  res.status(200).json({
    status: 'success',
    data: {
      events,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalEvents: count,
    },
  });
});

/**
 * @desc    Get single event
 * @route   GET /api/events/:id
 * @access  Public
 */
exports.getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'username avatar bio')
    .populate('attendees', 'username avatar');

  if (!event) {
    throw new ErrorResponse('Event not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: { event },
  });
});

/**
 * @desc    Create event
 * @route   POST /api/events
 * @access  Private
 */
exports.createEvent = asyncHandler(async (req, res) => {
  req.body.organizer = req.user._id;

  const event = await Event.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { event },
  });
});

/**
 * @desc    Update event
 * @route   PUT /api/events/:id
 * @access  Private (Organizer or Admin)
 */
exports.updateEvent = asyncHandler(async (req, res) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Event not found', 404);
  }

  if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this event', 403);
  }

  event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: { event },
  });
});

/**
 * @desc    Delete event
 * @route   DELETE /api/events/:id
 * @access  Private (Organizer or Admin)
 */
exports.deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Event not found', 404);
  }

  if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to delete this event', 403);
  }

  await event.remove();

  res.status(200).json({
    status: 'success',
    message: 'Event deleted successfully',
  });
});

/**
 * @desc    Register for event
 * @route   POST /api/events/:id/register
 * @access  Private
 */
exports.registerForEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Event not found', 404);
  }

  if (event.attendees.includes(req.user._id)) {
    throw new ErrorResponse('Already registered for this event', 400);
  }

  if (event.maxAttendees && event.attendeesCount >= event.maxAttendees) {
    throw new ErrorResponse('Event is full', 400);
  }

  event.attendees.push(req.user._id);
  event.attendeesCount = event.attendees.length;
  await event.save();

  res.status(200).json({
    status: 'success',
    message: 'Successfully registered for event',
    data: { event },
  });
});

/**
 * @desc    Cancel event registration
 * @route   DELETE /api/events/:id/register
 * @access  Private
 */
exports.cancelEventRegistration = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Event not found', 404);
  }

  event.attendees = event.attendees.filter(
    (attendee) => attendee.toString() !== req.user._id.toString()
  );
  event.attendeesCount = event.attendees.length;
  await event.save();

  res.status(200).json({
    status: 'success',
    message: 'Successfully cancelled event registration',
    data: { event },
  });
});

