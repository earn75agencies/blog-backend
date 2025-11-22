const Event = require('../models/Event.model');
const Webinar = require('../models/Webinar.model');
const Ticket = require('../models/Ticket.model');
const TicketPurchase = require('../models/TicketPurchase.model');
const Payment = require('../models/Payment.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Create event
 * @route   POST /api/events
 * @access  Private
 */
exports.createEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    date,
    endDate,
    location,
    category,
    image,
    maxAttendees,
    price,
    currency,
    isPublic,
    features,
    requiresRegistration,
    isRecurring,
    recurrence,
  } = req.body;

  const event = await Event.create({
    title,
    description,
    date: new Date(date),
    endDate: endDate ? new Date(endDate) : null,
    location,
    organizer: req.user._id,
    category,
    image,
    maxAttendees,
    price: price || 0,
    currency: currency || 'USD',
    isPublic: isPublic !== undefined ? isPublic : true,
    features: features || {},
    requiresRegistration: requiresRegistration || false,
    isRecurring: isRecurring || false,
    recurrence: recurrence || {},
    status: 'upcoming',
  });

  res.status(201).json({
    status: 'success',
    data: { event },
  });
});

/**
 * @desc    Create webinar
 * @route   POST /api/webinars
 * @access  Private
 */
exports.createWebinar = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    scheduledAt,
    duration,
    maxAttendees,
    features,
    isPublic,
    requiresRegistration,
    price,
    currency,
  } = req.body;

  const webinar = await Webinar.create({
    title,
    description,
    scheduledAt: new Date(scheduledAt),
    duration: duration || 60,
    maxAttendees,
    hosts: [{ user: req.user._id, role: 'host' }],
    features: features || {},
    isPublic: isPublic !== undefined ? isPublic : true,
    requiresRegistration: requiresRegistration || false,
    price: price || 0,
    currency: currency || 'USD',
    status: 'scheduled',
  });

  res.status(201).json({
    status: 'success',
    data: { webinar },
  });
});

/**
 * @desc    Get events
 * @route   GET /api/events
 * @access  Public
 */
exports.getEvents = asyncHandler(async (req, res) => {
  const { status, category, organizer, upcoming } = req.query;

  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (organizer) query.organizer = organizer;
  if (upcoming === 'true') {
    query.date = { $gte: new Date() };
  }

  const events = await Event.find(query)
    .populate('organizer', 'username avatar')
    .sort({ date: 1 });

  res.json({
    status: 'success',
    data: { events },
  });
});

/**
 * @desc    Get webinars
 * @route   GET /api/webinars
 * @access  Public
 */
exports.getWebinars = asyncHandler(async (req, res) => {
  const { status, upcoming } = req.query;

  const query = {};
  if (status) query.status = status;
  if (upcoming === 'true') {
    query.scheduledAt = { $gte: new Date() };
  }

  const webinars = await Webinar.find(query)
    .populate('hosts.user', 'username avatar')
    .sort({ scheduledAt: 1 });

  res.json({
    status: 'success',
    data: { webinars },
  });
});

/**
 * @desc    Register for event
 * @route   POST /api/events/:id/register
 * @access  Private
 */
exports.registerForEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    throw new ErrorResponse('Event not found', 404);
  }

  if (event.status !== 'upcoming') {
    throw new ErrorResponse('Event registration is closed', 400);
  }

  if (event.maxAttendees && event.attendeesCount >= event.maxAttendees) {
    // Add to waitlist
    if (!event.waitlist.includes(req.user._id)) {
      event.waitlist.push(req.user._id);
      await event.save();
    }
    return res.json({
      status: 'success',
      message: 'Added to waitlist',
      data: { waitlist: true },
    });
  }

  if (event.attendees.includes(req.user._id)) {
    throw new ErrorResponse('Already registered for this event', 400);
  }

  // Handle payment if event has price
  if (event.price > 0) {
    const payment = await Payment.create({
      user: req.user._id,
      amount: event.price,
      currency: event.currency,
      status: 'completed',
      paymentMethod: 'event-registration',
    });
  }

  event.attendees.push(req.user._id);
  event.attendeesCount += 1;
  await event.save();

  res.json({
    status: 'success',
    message: 'Registered for event successfully',
    data: { event },
  });
});

/**
 * @desc    Create ticket for event
 * @route   POST /api/events/:id/tickets
 * @access  Private
 */
exports.createTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, tier, price, currency, quantity, benefits, saleStart, saleEnd } = req.body;

  const event = await Event.findById(id);
  if (!event) {
    throw new ErrorResponse('Event not found', 404);
  }

  // Check if user is organizer
  if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  const ticket = await Ticket.create({
    event: id,
    name,
    tier,
    price,
    currency: currency || 'USD',
    quantity: {
      total: quantity.total,
      available: quantity.total,
      sold: 0,
    },
    benefits: benefits || [],
    saleStart: new Date(saleStart),
    saleEnd: new Date(saleEnd),
  });

  event.hasTickets = true;
  event.tickets.push(ticket._id);
  await event.save();

  res.status(201).json({
    status: 'success',
    data: { ticket },
  });
});

/**
 * @desc    Purchase ticket
 * @route   POST /api/tickets/:id/purchase
 * @access  Private
 */
exports.purchaseTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity = 1, attendees } = req.body;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new ErrorResponse('Ticket not found', 404);
  }

  if (!ticket.isActive) {
    throw new ErrorResponse('Ticket is not available', 400);
  }

  const now = new Date();
  if (now < ticket.saleStart || now > ticket.saleEnd) {
    throw new ErrorResponse('Ticket sale is not active', 400);
  }

  if (ticket.quantity.available < quantity) {
    throw new ErrorResponse('Not enough tickets available', 400);
  }

  const totalAmount = ticket.price * quantity;

  // Create payment
  const payment = await Payment.create({
    user: req.user._id,
    amount: totalAmount,
    currency: ticket.currency,
    status: 'completed',
    paymentMethod: 'ticket-purchase',
  });

  // Create ticket purchase
  const ticketPurchase = await TicketPurchase.create({
    ticket: id,
    buyer: req.user._id,
    quantity,
    totalAmount,
    currency: ticket.currency,
    payment: {
      paymentId: payment._id,
      transactionId: payment._id.toString(),
      status: 'completed',
    },
    qrCode: `TICKET-${Date.now()}-${req.user._id}`,
    attendees: attendees || [],
  });

  // Update ticket availability
  ticket.quantity.available -= quantity;
  ticket.quantity.sold += quantity;
  await ticket.save();

  res.status(201).json({
    status: 'success',
    message: 'Ticket purchased successfully',
    data: { ticketPurchase },
  });
});

