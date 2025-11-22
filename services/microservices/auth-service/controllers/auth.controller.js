const asyncHandler = require('../../../utils/asyncHandler');
const ErrorResponse = require('../../../utils/ErrorResponse');
const User = require('../../../models/User.model');
const jwt = require('../../../config/jwt.config');
const emailUtil = require('../../../utils/email.util');

/**
 * Register new user
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
 * Login user
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

  res.status(200).json({
    status: 'success',
    message: 'User logged in successfully',
    data: {
      user: user.toSafeObject(),
      token,
      refreshToken,
    },
  });
});

/**
 * Logout user
 */
exports.logout = asyncHandler(async (req, res) => {
  // In a JWT-based system, logout is typically handled client-side
  // by removing the token. If using refresh tokens, you might want
  // to blacklist them here.
  
  res.status(200).json({
    status: 'success',
    message: 'User logged out successfully',
  });
});

/**
 * Refresh token
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ErrorResponse('Refresh token is required', 400);
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new ErrorResponse('Invalid or expired refresh token', 401);
  }

  // Find user
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new ErrorResponse('User not found or inactive', 401);
  }

  // Generate new access token
  const newToken = user.generateAuthToken();

  res.status(200).json({
    status: 'success',
    data: {
      token: newToken,
    },
  });
});

/**
 * Verify email
 */
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Verify token
  let decoded;
  try {
    decoded = jwt.verifyEmailVerificationToken(token);
  } catch (error) {
    throw new ErrorResponse('Invalid or expired verification token', 400);
  }

  // Find user
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  if (user.isEmailVerified) {
    return res.json({
      status: 'success',
      message: 'Email already verified',
    });
  }

  // Verify email
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully',
  });
});

/**
 * Forgot password
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findByEmailOrUsername(email);
  if (!user) {
    // Don't reveal if user exists (security)
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
  }

  res.status(200).json({
    status: 'success',
    message: 'If an account exists, a password reset email has been sent',
  });
});

/**
 * Reset password
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new ErrorResponse('Token and password are required', 400);
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verifyPasswordResetToken(token);
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

  res.status(200).json({
    status: 'success',
    message: 'Password reset successfully',
    data: {
      token: authToken,
    },
  });
});

