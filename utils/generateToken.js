const jwt = require('../config/jwt.config');

/**
 * Generate JWT token from user ID
 * @param {string|Object} userId - User ID or payload object
 * @param {string} expiresIn - Token expiration time (optional)
 * @returns {string} JWT token
 */
const generateToken = (userId, expiresIn) => {
  const payload = typeof userId === 'object' ? userId : { id: userId };
  return jwt.generateToken(payload, expiresIn);
};

/**
 * Generate refresh token
 * @param {string|Object} userId - User ID or payload object
 * @returns {string} Refresh token
 */
const generateRefreshToken = (userId) => {
  const payload = typeof userId === 'object' ? userId : { id: userId };
  return jwt.generateRefreshToken(payload);
};

/**
 * Verify token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token
 */
const verifyToken = (token) => {
  return jwt.verifyToken(token);
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
};

