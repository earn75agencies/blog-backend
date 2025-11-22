const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const Newsletter = require('../models/Newsletter.model');
const crypto = require('crypto');
const emailUtil = require('../utils/email.util');

/**
 * @desc    Subscribe to newsletter
 * @route   POST /api/newsletter/subscribe
 * @access  Public
 */
exports.subscribe = asyncHandler(async (req, res) => {
  const { email, tags = [] } = req.body;

  if (!email) {
    throw new ErrorResponse('Email is required', 400);
  }

  // Check if already subscribed
  let subscription = await Newsletter.findOne({ email: email.toLowerCase() });

  if (subscription) {
    if (subscription.status === 'subscribed') {
      throw new ErrorResponse('Email is already subscribed', 400);
    }
    // Re-subscribe if previously unsubscribed
    subscription.status = 'subscribed';
    subscription.subscribedAt = new Date();
    subscription.unsubscribedAt = null;
    subscription.tags = tags;
    subscription.metadata = {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      referrer: req.get('referer'),
    };
    await subscription.save();
  } else {
    // Create new subscription
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    subscription = await Newsletter.create({
      email: email.toLowerCase(),
      tags,
      unsubscribeToken,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        referrer: req.get('referer'),
      },
      source: 'website',
    });
  }

  // Send confirmation email
  try {
    await emailUtil.sendNewsletterConfirmation(subscription.email, subscription.unsubscribeToken);
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    // Don't fail the subscription if email fails
  }

  res.status(201).json({
    status: 'success',
    message: 'Successfully subscribed to newsletter',
    data: {
      subscription: {
        email: subscription.email,
        subscribedAt: subscription.subscribedAt,
      },
    },
  });
});

/**
 * @desc    Unsubscribe from newsletter
 * @route   POST /api/newsletter/unsubscribe
 * @access  Public
 */
exports.unsubscribe = asyncHandler(async (req, res) => {
  const { email, token } = req.body;

  if (!email && !token) {
    throw new ErrorResponse('Email or token is required', 400);
  }

  let subscription;
  if (token) {
    subscription = await Newsletter.findOne({ unsubscribeToken: token }).select('+unsubscribeToken');
  } else {
    subscription = await Newsletter.findOne({ email: email.toLowerCase() });
  }

  if (!subscription) {
    throw new ErrorResponse('Subscription not found', 404);
  }

  subscription.status = 'unsubscribed';
  subscription.unsubscribedAt = new Date();
  await subscription.save();

  res.json({
    status: 'success',
    message: 'Successfully unsubscribed from newsletter',
  });
});

/**
 * @desc    Get newsletter subscribers (Admin only)
 * @route   GET /api/newsletter/subscribers
 * @access  Private/Admin
 */
exports.getSubscribers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  const { status, search } = req.query;

  const query = {};
  if (status) {
    query.status = status;
  }
  if (search) {
    query.email = { $regex: search, $options: 'i' };
  }

  const [subscribers, total] = await Promise.all([
    Newsletter.find(query)
      .select('-unsubscribeToken')
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Newsletter.countDocuments(query),
  ]);

  res.json({
    status: 'success',
    results: subscribers.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      subscribers,
    },
  });
});

/**
 * @desc    Send newsletter (Admin only)
 * @route   POST /api/newsletter/send
 * @access  Private/Admin
 */
exports.sendNewsletter = asyncHandler(async (req, res) => {
  const { subject, content, tags = [] } = req.body;

  if (!subject || !content) {
    throw new ErrorResponse('Subject and content are required', 400);
  }

  // Get subscribers
  const query = { status: 'subscribed' };
  if (tags.length > 0) {
    query.tags = { $in: tags };
  }

  const subscribers = await Newsletter.find(query).select('email');

  if (subscribers.length === 0) {
    throw new ErrorResponse('No subscribers found', 404);
  }

  // Send emails (in production, use a queue system)
  const emailPromises = subscribers.map((subscriber) =>
    emailUtil.sendNewsletter(subscriber.email, subject, content, subscriber.unsubscribeToken).catch((err) => {
      console.error(`Failed to send to ${subscriber.email}:`, err);
      return null;
    })
  );

  await Promise.all(emailPromises);

  res.json({
    status: 'success',
    message: `Newsletter sent to ${subscribers.length} subscribers`,
    data: {
      sent: subscribers.length,
    },
  });
});

/**
 * @desc    Get subscription status
 * @route   GET /api/newsletter/status
 * @access  Public
 */
exports.getStatus = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    throw new ErrorResponse('Email is required', 400);
  }

  const subscription = await Newsletter.findOne({ email: email.toLowerCase() });

  if (!subscription) {
    return res.json({
      status: 'success',
      data: {
        subscribed: false,
      },
    });
  }

  res.json({
    status: 'success',
    data: {
      subscribed: subscription.status === 'subscribed',
      status: subscription.status,
      subscribedAt: subscription.subscribedAt,
    },
  });
});

