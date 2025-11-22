const MagicLink = require('../models/MagicLink.model');
const User = require('../models/User.model');
const Session = require('../models/Session.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const { generateToken } = require('../utils/generateToken');
const emailUtil = require('../utils/email.util');

/**
 * @desc    Request magic link
 * @route   POST /api/auth/magic-link
 * @access  Public
 */
exports.requestMagicLink = asyncHandler(async (req, res) => {
  const { email, purpose = 'login' } = req.body;

  if (!email) {
    throw new ErrorResponse('Email is required', 400);
  }

  // Find or create user for signup
  let user = await User.findOne({ email: email.toLowerCase() });

  if (purpose === 'signup' && user) {
    throw new ErrorResponse('User already exists', 400);
  }

  if (purpose === 'login' && !user) {
    throw new ErrorResponse('User not found', 404);
  }

  // Create magic link
  const magicLink = await MagicLink.create({
    email: email.toLowerCase(),
    user: user?._id,
    purpose,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Send email
  const magicLinkUrl = `${process.env.FRONTEND_URL}/auth/magic-link/${magicLink.token}`;
  await emailUtil.sendEmail({
    to: email.toLowerCase(),
    subject: purpose === 'signup' ? 'Complete Your Registration - Gidix' : 'Your Login Link - Gidix',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${purpose === 'signup' ? 'Complete Your Registration' : 'Login to Your Account'}</h2>
        <p>Click the link below to ${purpose === 'signup' ? 'complete your registration' : 'login'}:</p>
        <a href="${magicLinkUrl}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">${purpose === 'signup' ? 'Complete Registration' : 'Login'}</a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
    text: `${purpose === 'signup' ? 'Complete Your Registration' : 'Login to Your Account'}\n\nClick the link below: ${magicLinkUrl}\n\nThis link will expire in 15 minutes.`,
  });

  res.json({
    status: 'success',
    message: 'Magic link sent to your email',
  });
});

/**
 * @desc    Verify magic link
 * @route   GET /api/auth/magic-link/:token
 * @access  Public
 */
exports.verifyMagicLink = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const magicLink = await MagicLink.findOne({ token });

  if (!magicLink) {
    throw new ErrorResponse('Invalid or expired magic link', 400);
  }

  if (magicLink.isUsed) {
    throw new ErrorResponse('Magic link already used', 400);
  }

  if (new Date() > magicLink.expiresAt) {
    throw new ErrorResponse('Magic link expired', 400);
  }

  let user = magicLink.user;

  // Create user if signup
  if (magicLink.purpose === 'signup' && !user) {
    user = await User.create({
      email: magicLink.email,
      username: magicLink.email.split('@')[0],
      isEmailVerified: true,
      provider: 'magic-link',
    });
  }

  // Mark as used
  magicLink.isUsed = true;
  magicLink.usedAt = new Date();
  await magicLink.save();

  // Create session
  const session = await Session.create({
    user: user._id,
    sessionToken: generateToken(user._id),
    device: {
      type: req.device?.type || 'other',
      userAgent: req.headers['user-agent'],
    },
    ipAddress: req.ip,
    loginMethod: 'magic-link',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  res.json({
    status: 'success',
    data: {
      user,
      token: session.sessionToken,
      sessionId: session._id,
    },
  });
});

