const mongoose = require('mongoose');
const ViralityScore = require('../models/ViralityScore.model');
const Referral = require('../models/Referral.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const crypto = require('crypto');

/**
 * @desc    Get trending content
 * @route   GET /api/virality/trending
 * @access  Public
 */
exports.getTrendingContent = asyncHandler(async (req, res) => {
  const { region, contentType, limit = 50 } = req.query;

  const query = { trending: true };
  if (contentType) query.contentType = contentType;

  const viralityScores = await ViralityScore.find(query)
    .sort({ score: -1 })
    .limit(parseInt(limit))
    .populate('content');

  // Filter by region if specified
  let results = viralityScores;
  if (region) {
    results = viralityScores.filter(vs =>
      vs.regionalScores.some(rs => rs.region === region)
    );
  }

  res.json({
    status: 'success',
    data: { trending: results },
  });
});

/**
 * @desc    Get virality score
 * @route   GET /api/virality/:contentType/:contentId
 * @access  Public
 */
exports.getViralityScore = asyncHandler(async (req, res) => {
  const { contentType, contentId } = req.params;

  let viralityScore = await ViralityScore.findOne({
    content: contentId,
    contentType,
  });

  if (!viralityScore) {
    // Calculate initial score
    const content = await mongoose.model(contentType === 'post' ? 'Post' : 'Content').findById(contentId);
    if (!content) {
      throw new ErrorResponse('Content not found', 404);
    }

    viralityScore = await ViralityScore.create({
      content: contentId,
      contentType,
      score: 0,
      factors: {
        shares: content.shares || 0,
        engagement: content.engagementScore || 0,
        growthRate: 0,
        reach: content.views || 0,
        velocity: 0,
      },
    });
  }

  res.json({
    status: 'success',
    data: { viralityScore },
  });
});

/**
 * @desc    Create referral code
 * @route   POST /api/referrals
 * @access  Private
 */
exports.createReferral = asyncHandler(async (req, res) => {
  const { type, reward } = req.body;

  const code = crypto.randomBytes(8).toString('hex').toUpperCase();

  const referral = await Referral.create({
    referrer: req.user._id,
    code,
    type: type || 'user',
    reward: reward || { type: 'points', value: 100 },
    status: 'pending',
  });

  res.status(201).json({
    status: 'success',
    data: { referral },
  });
});

/**
 * @desc    Use referral code
 * @route   POST /api/referrals/use
 * @access  Private
 */
exports.useReferral = asyncHandler(async (req, res) => {
  const { code } = req.body;

  const referral = await Referral.findOne({ code, status: 'pending' });
  if (!referral) {
    throw new ErrorResponse('Invalid or expired referral code', 400);
  }

  if (referral.referred && referral.referred.toString() === req.user._id.toString()) {
    throw new ErrorResponse('Cannot use your own referral code', 400);
  }

  referral.referred = req.user._id;
  referral.status = 'completed';
  referral.rewardedAt = new Date();
  await referral.save();

  // Award reward to referrer
  // Implementation would go here

  res.json({
    status: 'success',
    message: 'Referral code applied successfully',
    data: { referral },
  });
});

