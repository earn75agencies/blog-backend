const User = require('../models/User.model');
const jwt = require('../config/jwt.config');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const emailUtil = require('../utils/email.util');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmailOrUsername(email);
  if (existingUser) {
    throw new ErrorResponse('User already exists with this email or username', 400);
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
  });

  // Generate email verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send verification email
  try {
    await emailUtil.sendVerificationEmail(user.email, verificationToken);
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Don't fail registration if email fails
  }

  // Generate JWT token
  const token = user.generateAuthToken();

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully. Please verify your email.',
    data: {
      user: user.toSafeObject(),
      token,
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password
  const user = await User.findByEmailOrUsername(email).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ErrorResponse('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new ErrorResponse('User account is deactivated', 401);
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate JWT token
  const token = user.generateAuthToken();
  const refreshToken = jwt.generateRefreshToken({ id: user._id });

  res.json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: user.toSafeObject(),
      token,
      refreshToken,
    },
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
  // In a JWT-based system, logout is typically handled client-side
  // by removing the token. If using refresh tokens, you might want
  // to blacklist them here.

  res.json({
    status: 'success',
    message: 'Logout successful',
  });
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('postsCount')
    .populate('favoritePosts');

  res.json({
    status: 'success',
    data: {
      user: user.toSafeObject(),
    },
  });
});

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  if (!(await user.comparePassword(currentPassword))) {
    throw new ErrorResponse('Current password is incorrect', 401);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Generate new token
  const token = user.generateAuthToken();

  res.json({
    status: 'success',
    message: 'Password updated successfully',
    data: {
      token,
    },
  });
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findByEmailOrUsername(email);
  if (!user) {
    // Don't reveal if user exists
    return res.json({
      status: 'success',
      message: 'If an account exists, a password reset email has been sent',
    });
  }

  // Generate reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Send reset email
  try {
    await emailUtil.sendPasswordResetEmail(user.email, resetToken);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    // Don't fail request if email fails
  }

  res.json({
    status: 'success',
    message: 'If an account exists, a password reset email has been sent',
  });
});

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Verify token
  let decoded;
  try {
    decoded = jwt.verifyToken(token);
  } catch (error) {
    throw new ErrorResponse('Invalid or expired reset token', 400);
  }

  // Find user
  const user = await User.findById(decoded.id).select('+passwordResetToken +passwordResetExpires');
  if (!user || user.passwordResetToken !== token) {
    throw new ErrorResponse('Invalid or expired reset token', 400);
  }

  if (user.passwordResetExpires < Date.now()) {
    throw new ErrorResponse('Reset token has expired', 400);
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Generate new token
  const authToken = user.generateAuthToken();

  res.json({
    status: 'success',
    message: 'Password reset successfully',
    data: {
      token: authToken,
    },
  });
});

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Verify token
  let decoded;
  try {
    decoded = jwt.verifyToken(token);
  } catch (error) {
    throw new ErrorResponse('Invalid or expired verification token', 400);
  }

  // Find user
  const user = await User.findById(decoded.id).select('+emailVerificationToken');
  if (!user || user.emailVerificationToken !== token) {
    throw new ErrorResponse('Invalid verification token', 400);
  }

  // Update user
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({
    status: 'success',
    message: 'Email verified successfully',
  });
});

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
exports.resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findByEmailOrUsername(email);
  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  if (user.isEmailVerified) {
    throw new ErrorResponse('Email already verified', 400);
  }

  // Generate new verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send verification email
  try {
    await emailUtil.sendVerificationEmail(user.email, verificationToken);
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Don't fail request if email fails
  }

  res.json({
    status: 'success',
    message: 'Verification email sent',
  });
});

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ErrorResponse('Refresh token is required', 400);
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verifyToken(refreshToken);
  } catch (error) {
    throw new ErrorResponse('Invalid or expired refresh token', 401);
  }

  // Find user
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new ErrorResponse('User not found or inactive', 401);
  }

  // Generate new access token
  const token = user.generateAuthToken();

  res.json({
    status: 'success',
    data: {
      token,
    },
  });
});

