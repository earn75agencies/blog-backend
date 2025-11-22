const jwt = require('jsonwebtoken');

/**
 * JWT configuration and utilities
 */
class JWTConfig {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.expiresIn = process.env.JWT_EXPIRE || '7d';
  }

  /**
   * Generate JWT token
   * @param {Object} payload - Data to encode in token
   * @param {string} expiresIn - Token expiration time
   * @returns {string} JWT token
   */
  generateToken(payload, expiresIn = this.expiresIn) {
    return jwt.sign(payload, this.secret, {
      expiresIn,
      issuer: 'gidix',
      audience: 'gidix-users',
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret, {
        issuer: 'gidix',
        audience: 'gidix-users',
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   * @param {string} token - JWT token to decode
   * @returns {Object} Decoded token payload
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Data to encode in token
   * @returns {string} Refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: '30d',
      issuer: 'gidix',
      audience: 'gidix-users',
    });
  }

  /**
   * Generate password reset token
   * @param {Object} payload - Data to encode in token
   * @returns {string} Password reset token
   */
  generatePasswordResetToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: '1h',
      issuer: 'gidix',
      audience: 'gidix-users',
    });
  }

  /**
   * Generate email verification token
   * @param {Object} payload - Data to encode in token
   * @returns {string} Email verification token
   */
  generateEmailVerificationToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: '24h',
      issuer: 'gidix',
      audience: 'gidix-users',
    });
  }
}

module.exports = new JWTConfig();

