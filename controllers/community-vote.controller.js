const CommunityVote = require('../models/CommunityVote.model');
const Group = require('../models/Group.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Vote on content
 * @route   POST /api/communities/:communityId/vote
 * @access  Private
 */
exports.vote = asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  const { content, contentType, type, reason } = req.body;

  const community = await Group.findById(communityId);
  if (!community) {
    throw new ErrorResponse('Community not found', 404);
  }

  // Check if user is member
  const isMember = community.members.some(
    m => m.user.toString() === req.user._id.toString()
  );

  if (!isMember && req.user.role !== 'admin') {
    throw new ErrorResponse('Not a member of this community', 403);
  }

  // Check if already voted
  const existingVote = await CommunityVote.findOne({
    community: communityId,
    content,
    contentType,
    voter: req.user._id,
  });

  if (existingVote) {
    // Update existing vote
    existingVote.type = type;
    existingVote.reason = reason;
    await existingVote.save();

    return res.json({
      status: 'success',
      data: { vote: existingVote },
    });
  }

  // Create new vote
  const vote = await CommunityVote.create({
    community: communityId,
    content,
    contentType,
    type,
    voter: req.user._id,
    reason,
    weight: 1, // Can be adjusted based on user reputation
  });

  res.status(201).json({
    status: 'success',
    data: { vote },
  });
});

/**
 * @desc    Get votes for content
 * @route   GET /api/communities/:communityId/votes
 * @access  Public
 */
exports.getVotes = asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  const { content, contentType } = req.query;

  const query = { community: communityId };
  if (content) query.content = content;
  if (contentType) query.contentType = contentType;

  const votes = await CommunityVote.find(query)
    .populate('voter', 'username avatar')
    .sort({ createdAt: -1 });

  // Aggregate votes
  const voteCounts = votes.reduce((acc, vote) => {
    acc[vote.type] = (acc[vote.type] || 0) + vote.weight;
    return acc;
  }, {});

  res.json({
    status: 'success',
    data: {
      votes,
      counts: voteCounts,
      total: votes.length,
    },
  });
});

/**
 * @desc    Remove vote
 * @route   DELETE /api/communities/:communityId/vote/:voteId
 * @access  Private
 */
exports.removeVote = asyncHandler(async (req, res) => {
  const { communityId, voteId } = req.params;

  const vote = await CommunityVote.findOne({
    _id: voteId,
    community: communityId,
    voter: req.user._id,
  });

  if (!vote) {
    throw new ErrorResponse('Vote not found', 404);
  }

  await vote.deleteOne();

  res.json({
    status: 'success',
    message: 'Vote removed successfully',
  });
});

