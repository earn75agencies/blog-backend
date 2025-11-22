const PaidContent = require('../models/PaidContent.model');
const Post = require('../models/Post.model');
const Payment = require('../models/Payment.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get paid content info
 * @route   GET /api/posts/:postId/paid-content
 * @access  Public
 */
exports.getPaidContent = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const paidContent = await PaidContent.findOne({ post: postId });

  if (!paidContent) {
    return res.json({
      status: 'success',
      data: { isPaid: false },
    });
  }

  // Check if user has purchased
  let hasAccess = false;
  if (req.user) {
    hasAccess = paidContent.purchasers.some(
      p => p.user.toString() === req.user._id.toString()
    );
  }

  res.json({
    status: 'success',
    data: {
      paidContent: {
        ...paidContent.toObject(),
        hasAccess,
        previewLength: hasAccess ? 100 : paidContent.previewLength,
      },
    },
  });
});

/**
 * @desc    Set post as paid content
 * @route   POST /api/posts/:postId/paid-content
 * @access  Private
 */
exports.setPaidContent = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { pricing, previewLength, previewType, accessRules } = req.body;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check permissions
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  const paidContent = await PaidContent.findOneAndUpdate(
    { post: postId },
    {
      post: postId,
      author: req.user._id,
      pricing: pricing || { type: 'one-time', amount: 0, currency: 'USD' },
      previewLength: previewLength || 0,
      previewType: previewType || 'percentage',
      accessRules: accessRules || {
        requireLogin: true,
        requireSubscription: false,
        subscriptionTiers: [],
        allowGift: false,
      },
    },
    { upsert: true, new: true }
  );

  res.json({
    status: 'success',
    data: { paidContent },
  });
});

/**
 * @desc    Purchase paid content
 * @route   POST /api/posts/:postId/paid-content/purchase
 * @access  Private
 */
exports.purchasePaidContent = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { paymentMethod, paymentId } = req.body;

  const paidContent = await PaidContent.findOne({ post: postId });
  if (!paidContent) {
    throw new ErrorResponse('Post is not paid content', 404);
  }

  // Check if already purchased
  const alreadyPurchased = paidContent.purchasers.some(
    p => p.user.toString() === req.user._id.toString()
  );

  if (alreadyPurchased) {
    throw new ErrorResponse('Content already purchased', 400);
  }

  // Create payment record
  const payment = await Payment.create({
    user: req.user._id,
    amount: paidContent.pricing.amount,
    currency: paidContent.pricing.currency,
    status: 'completed',
    paymentMethod,
    paymentProvider: paymentMethod,
    transactionId: paymentId,
  });

  // Add to purchasers
  paidContent.purchasers.push({
    user: req.user._id,
    purchasedAt: new Date(),
    amount: paidContent.pricing.amount,
    paymentId: payment._id,
  });

  paidContent.sales.total += 1;
  paidContent.sales.revenue += paidContent.pricing.amount;
  await paidContent.save();

  res.json({
    status: 'success',
    message: 'Content purchased successfully',
    data: { paidContent },
  });
});

