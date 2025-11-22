const Badge = require('../models/Badge.model');
const Achievement = require('../models/Achievement.model');
const Leaderboard = require('../models/Leaderboard.model');
const LoyaltyPoints = require('../models/LoyaltyPoints.model');
const CreatorRank = require('../models/CreatorRank.model');
const Streak = require('../models/Streak.model');
const Tournament = require('../models/Tournament.model');
const VirtualGood = require('../models/VirtualGood.model');
const Token = require('../models/Token.model');
const Quest = require('../models/Quest.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get user badges
 * @route   GET /api/gamification/badges
 * @access  Private
 */
exports.getUserBadges = asyncHandler(async (req, res) => {
  const badges = await Badge.find({
    'earnedBy.user': req.user._id,
    isActive: true,
  }).sort({ 'earnedBy.earnedAt': -1 });

  res.json({
    status: 'success',
    data: { badges },
  });
});

/**
 * @desc    Get user achievements
 * @route   GET /api/gamification/achievements
 * @access  Private
 */
exports.getUserAchievements = asyncHandler(async (req, res) => {
  const achievements = await Achievement.find({
    'earnedBy.user': req.user._id,
    isActive: true,
  }).sort({ 'earnedBy.earnedAt': -1 });

  res.json({
    status: 'success',
    data: { achievements },
  });
});

/**
 * @desc    Get leaderboard
 * @route   GET /api/gamification/leaderboard
 * @access  Public
 */
exports.getLeaderboard = asyncHandler(async (req, res) => {
  const { category = 'overall', period = 'all-time', limit = 100 } = req.query;

  const leaderboard = await Leaderboard.find({ category, period })
    .populate('user', 'username avatar reputationLevel')
    .sort({ points: -1 })
    .limit(parseInt(limit));

  // Get user's rank if authenticated
  let userRank = null;
  if (req.user) {
    const userEntry = await Leaderboard.findOne({
      user: req.user._id,
      category,
      period,
    });
    if (userEntry) {
      userRank = {
        rank: userEntry.rank,
        points: userEntry.points,
        stats: userEntry.stats,
      };
    }
  }

  res.json({
    status: 'success',
    data: {
      leaderboard,
      userRank,
    },
  });
});

/**
 * @desc    Get user loyalty points
 * @route   GET /api/gamification/loyalty-points
 * @access  Private
 */
exports.getLoyaltyPoints = asyncHandler(async (req, res) => {
  let loyaltyPoints = await LoyaltyPoints.findOne({ user: req.user._id });

  if (!loyaltyPoints) {
    loyaltyPoints = await LoyaltyPoints.create({
      user: req.user._id,
      balance: 0,
      tier: 'bronze',
    });
  }

  res.json({
    status: 'success',
    data: { loyaltyPoints },
  });
});

/**
 * @desc    Get creator rank
 * @route   GET /api/gamification/creator-rank
 * @access  Private
 */
exports.getCreatorRank = asyncHandler(async (req, res) => {
  let creatorRank = await CreatorRank.findOne({ user: req.user._id });

  if (!creatorRank) {
    creatorRank = await CreatorRank.create({
      user: req.user._id,
      rank: 'bronze',
      xp: 0,
      level: 1,
    });
  }

  res.json({
    status: 'success',
    data: { creatorRank },
  });
});

/**
 * @desc    Get user streaks
 * @route   GET /api/gamification/streaks
 * @access  Private
 */
exports.getStreaks = asyncHandler(async (req, res) => {
  const streaks = await Streak.find({ user: req.user._id });

  res.json({
    status: 'success',
    data: { streaks },
  });
});

/**
 * @desc    Get active tournaments
 * @route   GET /api/gamification/tournaments
 * @access  Public
 */
exports.getTournaments = asyncHandler(async (req, res) => {
  const { status = 'active', type } = req.query;

  const query = { status };
  if (type) query.type = type;

  const tournaments = await Tournament.find(query)
    .populate('participants.user', 'username avatar')
    .sort({ startDate: 1 });

  res.json({
    status: 'success',
    data: { tournaments },
  });
});

/**
 * @desc    Join tournament
 * @route   POST /api/gamification/tournaments/:id/join
 * @access  Private
 */
exports.joinTournament = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const tournament = await Tournament.findById(id);
  if (!tournament) {
    throw new ErrorResponse('Tournament not found', 404);
  }

  if (tournament.status !== 'active' && tournament.status !== 'upcoming') {
    throw new ErrorResponse('Tournament is not accepting participants', 400);
  }

  if (tournament.maxParticipants && tournament.participantsCount >= tournament.maxParticipants) {
    throw new ErrorResponse('Tournament is full', 400);
  }

  const existingParticipant = tournament.participants.find(
    p => p.user.toString() === req.user._id.toString()
  );

  if (existingParticipant) {
    throw new ErrorResponse('Already participating in this tournament', 400);
  }

  tournament.participants.push({
    user: req.user._id,
    joinedAt: new Date(),
    score: 0,
  });
  tournament.participantsCount += 1;
  await tournament.save();

  res.json({
    status: 'success',
    message: 'Joined tournament successfully',
    data: { tournament },
  });
});

/**
 * @desc    Get virtual goods marketplace
 * @route   GET /api/gamification/virtual-goods
 * @access  Public
 */
exports.getVirtualGoods = asyncHandler(async (req, res) => {
  const { type, rarity, creator } = req.query;

  const query = { isActive: true };
  if (type) query.type = type;
  if (rarity) query.rarity = rarity;
  if (creator) query.creator = creator;

  const virtualGoods = await VirtualGood.find(query)
    .populate('creator', 'username avatar')
    .sort({ createdAt: -1 });

  res.json({
    status: 'success',
    data: { virtualGoods },
  });
});

/**
 * @desc    Purchase virtual good
 * @route   POST /api/gamification/virtual-goods/:id/purchase
 * @access  Private
 */
exports.purchaseVirtualGood = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const virtualGood = await VirtualGood.findById(id);
  if (!virtualGood) {
    throw new ErrorResponse('Virtual good not found', 404);
  }

  if (!virtualGood.isActive) {
    throw new ErrorResponse('Virtual good is not available', 400);
  }

  // Check supply
  if (virtualGood.supply.total > 0 && virtualGood.supply.available <= 0) {
    throw new ErrorResponse('Virtual good is sold out', 400);
  }

  // Handle payment based on pricing type
  if (virtualGood.pricing.type === 'tokens') {
    const token = await Token.findOne({ user: req.user._id });
    if (!token || token.balance < virtualGood.pricing.amount) {
      throw new ErrorResponse('Insufficient tokens', 400);
    }
    await token.spend(virtualGood.pricing.amount, `Purchase: ${virtualGood.name}`);
  } else if (virtualGood.pricing.type === 'points') {
    const loyaltyPoints = await LoyaltyPoints.findOne({ user: req.user._id });
    if (!loyaltyPoints || loyaltyPoints.balance < virtualGood.pricing.amount) {
      throw new ErrorResponse('Insufficient loyalty points', 400);
    }
    await loyaltyPoints.redeem(virtualGood.pricing.amount, `Purchase: ${virtualGood.name}`);
  }
  // For cash/NFT, handle payment separately

  // Update supply
  if (virtualGood.supply.total > 0) {
    virtualGood.supply.available -= 1;
  }
  virtualGood.sales.total += 1;
  virtualGood.sales.revenue += virtualGood.pricing.amount;
  await virtualGood.save();

  res.json({
    status: 'success',
    message: 'Virtual good purchased successfully',
    data: { virtualGood },
  });
});

