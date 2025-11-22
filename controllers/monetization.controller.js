const Subscription = require('../models/Subscription.model');
const Ad = require('../models/Ad.model');
const Crowdfund = require('../models/Crowdfund.model');
const Product = require('../models/Product.model');
const Affiliate = require('../models/Affiliate.model');
const Payment = require('../models/Payment.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get user subscription
 * @route   GET /api/monetization/subscription
 * @access  Private
 */
exports.getSubscription = asyncHandler(async (req, res) => {
  let subscription = await Subscription.findOne({ user: req.user._id });

  if (!subscription) {
    subscription = await Subscription.create({
      user: req.user._id,
      tier: 'free',
      status: 'active',
    });
  }

  res.json({
    status: 'success',
    data: { subscription },
  });
});

/**
 * @desc    Upgrade subscription
 * @route   POST /api/monetization/subscription/upgrade
 * @access  Private
 */
exports.upgradeSubscription = asyncHandler(async (req, res) => {
  const { tier, interval = 'monthly' } = req.body;

  const tierPricing = {
    basic: { monthly: 9.99, yearly: 99.99 },
    pro: { monthly: 29.99, yearly: 299.99 },
    platinum: { monthly: 99.99, yearly: 999.99 },
    enterprise: { monthly: 499.99, yearly: 4999.99 },
  };

  if (!tierPricing[tier]) {
    throw new ErrorResponse('Invalid subscription tier', 400);
  }

  let subscription = await Subscription.findOne({ user: req.user._id });

  const amount = tierPricing[tier][interval];
  const endDate = new Date();
  if (interval === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  if (subscription) {
    subscription.tier = tier;
    subscription.status = 'active';
    subscription.payment.amount = amount;
    subscription.payment.interval = interval;
    subscription.endDate = endDate;
    subscription.renewalDate = endDate;
  } else {
    subscription = await Subscription.create({
      user: req.user._id,
      tier,
      status: 'active',
      endDate,
      renewalDate: endDate,
      payment: {
        amount,
        interval,
      },
    });
  }

  // Create payment record
  const payment = await Payment.create({
    user: req.user._id,
    amount,
    currency: 'USD',
    status: 'completed',
    paymentMethod: 'subscription',
    paymentProvider: 'stripe',
  });

  subscription.payment.paymentId = payment._id;
  subscription.payment.lastPaymentDate = new Date();
  await subscription.save();

  res.json({
    status: 'success',
    message: 'Subscription upgraded successfully',
    data: { subscription },
  });
});

/**
 * @desc    Create ad campaign
 * @route   POST /api/monetization/ads
 * @access  Private
 */
exports.createAd = asyncHandler(async (req, res) => {
  const {
    title,
    type,
    content,
    targeting,
    pricing,
    budget,
    schedule,
  } = req.body;

  const ad = await Ad.create({
    title,
    advertiser: req.user._id,
    type,
    content,
    targeting: targeting || {},
    pricing,
    budget,
    schedule,
    status: 'draft',
  });

  res.status(201).json({
    status: 'success',
    data: { ad },
  });
});

/**
 * @desc    Get user ads
 * @route   GET /api/monetization/ads
 * @access  Private
 */
exports.getAds = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const query = { advertiser: req.user._id };
  if (status) query.status = status;

  const ads = await Ad.find(query).sort({ createdAt: -1 });

  res.json({
    status: 'success',
    data: { ads },
  });
});

/**
 * @desc    Create crowdfunding campaign
 * @route   POST /api/monetization/crowdfunding
 * @access  Private
 */
exports.createCrowdfunding = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    goal,
    currency,
    category,
    tags,
    startDate,
    endDate,
    rewards,
    images,
    featuredImage,
    video,
  } = req.body;

  const crowdfund = await Crowdfund.create({
    creator: req.user._id,
    title,
    description,
    goal,
    currency: currency || 'USD',
    category,
    tags,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    rewards: rewards || [],
    images: images || [],
    featuredImage,
    video,
    status: 'draft',
  });

  res.status(201).json({
    status: 'success',
    data: { crowdfund },
  });
});

/**
 * @desc    Get crowdfunding campaigns
 * @route   GET /api/monetization/crowdfunding
 * @access  Public
 */
exports.getCrowdfunding = asyncHandler(async (req, res) => {
  const { status = 'active', category, creator } = req.query;

  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (creator) query.creator = creator;

  const campaigns = await Crowdfund.find(query)
    .populate('creator', 'username avatar')
    .sort({ createdAt: -1 });

  res.json({
    status: 'success',
    data: { campaigns },
  });
});

/**
 * @desc    Back crowdfunding campaign
 * @route   POST /api/monetization/crowdfunding/:id/back
 * @access  Private
 */
exports.backCrowdfunding = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, reward, isAnonymous } = req.body;

  const campaign = await Crowdfund.findById(id);
  if (!campaign) {
    throw new ErrorResponse('Campaign not found', 404);
  }

  if (campaign.status !== 'active') {
    throw new ErrorResponse('Campaign is not active', 400);
  }

  // Create payment
  const payment = await Payment.create({
    user: req.user._id,
    amount,
    currency: campaign.currency,
    status: 'completed',
    paymentMethod: 'crowdfunding',
  });

  // Add backer
  await campaign.addBacker(req.user._id, amount, reward, isAnonymous);

  res.json({
    status: 'success',
    message: 'Campaign backed successfully',
    data: { campaign },
  });
});

