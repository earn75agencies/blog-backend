const SocialLogin = require('../models/SocialLogin.model');
const User = require('../models/User.model');
const Session = require('../models/Session.model');
const Device = require('../models/Device.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const { generateToken } = require('../utils/generateToken');

/**
 * @desc    Social login (Google, Facebook, Apple, LinkedIn)
 * @route   POST /api/auth/social/:provider
 * @access  Public
 */
exports.socialLogin = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { accessToken, providerId, email, name, picture } = req.body;

  // Validate provider
  const validProviders = ['google', 'facebook', 'apple', 'linkedin'];
  if (!validProviders.includes(provider)) {
    throw new ErrorResponse('Invalid social provider', 400);
  }

  // Find or create social login
  let socialLogin = await SocialLogin.findOne({ provider, providerId });
  let user;

  if (socialLogin) {
    user = await User.findById(socialLogin.user);
  } else {
    // Check if user exists with this email
    if (email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      // Create new user
      user = await User.create({
        email,
        username: email?.split('@')[0] || `user_${Date.now()}`,
        firstName: name?.split(' ')[0] || '',
        lastName: name?.split(' ').slice(1).join(' ') || '',
        avatar: picture,
        isEmailVerified: true,
        provider: 'social',
      });
    }

    // Create social login
    socialLogin = await SocialLogin.create({
      user: user._id,
      provider,
      providerId,
      email,
      profile: { name, picture },
      accessToken,
      isPrimary: !user.password, // Primary if no password set
    });
  }

  // Create session
  const session = await Session.create({
    user: user._id,
    sessionToken: generateToken(user._id),
    device: {
      type: req.device?.type || 'other',
      userAgent: req.headers['user-agent'],
    },
    ipAddress: req.ip,
    loginMethod: 'social',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  // Update device trust
  const deviceFingerprint = req.headers['x-device-fingerprint'];
  if (deviceFingerprint) {
    await Device.findOneAndUpdate(
      { fingerprint: deviceFingerprint },
      {
        user: user._id,
        lastSeen: new Date(),
        $inc: { loginCount: 1 },
      },
      { upsert: true, new: true }
    );
  }

  res.json({
    status: 'success',
    data: {
      user,
      token: session.sessionToken,
      sessionId: session._id,
    },
  });
});

/**
 * @desc    Link social account
 * @route   POST /api/auth/social/:provider/link
 * @access  Private
 */
exports.linkSocialAccount = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { accessToken, providerId, email } = req.body;

  // Check if already linked
  const existing = await SocialLogin.findOne({
    user: req.user._id,
    provider,
  });

  if (existing) {
    throw new ErrorResponse('Social account already linked', 400);
  }

  // Create social login link
  const socialLogin = await SocialLogin.create({
    user: req.user._id,
    provider,
    providerId,
    email,
    accessToken,
    isPrimary: false,
  });

  res.json({
    status: 'success',
    data: { socialLogin },
  });
});

/**
 * @desc    Unlink social account
 * @route   DELETE /api/auth/social/:provider/unlink
 * @access  Private
 */
exports.unlinkSocialAccount = asyncHandler(async (req, res) => {
  const { provider } = req.params;

  const socialLogin = await SocialLogin.findOne({
    user: req.user._id,
    provider,
  });

  if (!socialLogin) {
    throw new ErrorResponse('Social account not linked', 404);
  }

  if (socialLogin.isPrimary) {
    throw new ErrorResponse('Cannot unlink primary account', 400);
  }

  await socialLogin.deleteOne();

  res.json({
    status: 'success',
    message: 'Social account unlinked successfully',
  });
});

/**
 * @desc    Get user sessions
 * @route   GET /api/auth/sessions
 * @access  Private
 */
exports.getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ user: req.user._id })
    .sort({ lastActivity: -1 })
    .limit(20);

  res.json({
    status: 'success',
    data: { sessions },
  });
});

/**
 * @desc    Revoke session
 * @route   DELETE /api/auth/sessions/:sessionId
 * @access  Private
 */
exports.revokeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await Session.findOne({
    _id: sessionId,
    user: req.user._id,
  });

  if (!session) {
    throw new ErrorResponse('Session not found', 404);
  }

  session.isActive = false;
  await session.save();

  res.json({
    status: 'success',
    message: 'Session revoked successfully',
  });
});

/**
 * @desc    Revoke all sessions
 * @route   DELETE /api/auth/sessions
 * @access  Private
 */
exports.revokeAllSessions = asyncHandler(async (req, res) => {
  await Session.updateMany(
    { user: req.user._id, isActive: true },
    { isActive: false }
  );

  res.json({
    status: 'success',
    message: 'All sessions revoked successfully',
  });
});

