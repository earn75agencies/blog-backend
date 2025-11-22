const crypto = require('crypto');

/**
 * Encryption utility functions
 * Provides encryption and hashing functions
 */

/**
 * Hash string using SHA-256
 * @param {string} text - Text to hash
 * @returns {string} Hashed string
 */
const hashSHA256 = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Hash string using MD5
 * @param {string} text - Text to hash
 * @returns {string} Hashed string
 */
const hashMD5 = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return crypto.createHash('md5').update(text).digest('hex');
};

/**
 * Generate random bytes
 * @param {number} length - Length of random bytes
 * @returns {Buffer} Random bytes
 */
const generateRandomBytes = (length = 32) => {
  return crypto.randomBytes(length);
};

/**
 * Generate random string
 * @param {number} length - Length of random string
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate secure token
 * @param {number} length - Length of token
 * @returns {string} Secure token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('base64url');
};

/**
 * Encrypt text using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key (must be 32 bytes)
 * @returns {string} Encrypted string (format: iv:authTag:encryptedData)
 */
const encrypt = (text, key) => {
  if (!text || typeof text !== 'string' || !key || typeof key !== 'string') {
    return '';
  }

  // Ensure key is 32 bytes (256 bits)
  const keyBuffer = Buffer.from(key, 'utf8').slice(0, 32);
  if (keyBuffer.length < 32) {
    // Pad key if needed
    const paddedKey = Buffer.alloc(32);
    keyBuffer.copy(paddedKey);
    keyBuffer = paddedKey;
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt text using AES-256-GCM
 * @param {string} encryptedText - Encrypted text (format: iv:authTag:encryptedData)
 * @param {string} key - Decryption key (must be 32 bytes)
 * @returns {string} Decrypted string
 */
const decrypt = (encryptedText, key) => {
  if (!encryptedText || typeof encryptedText !== 'string' || !key || typeof key !== 'string') {
    return '';
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      return '';
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    // Ensure key is 32 bytes (256 bits)
    let keyBuffer = Buffer.from(key, 'utf8').slice(0, 32);
    if (keyBuffer.length < 32) {
      // Pad key if needed
      const paddedKey = Buffer.alloc(32);
      keyBuffer.copy(paddedKey);
      keyBuffer = paddedKey;
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    return '';
  }
};

/**
 * Compare hashed values
 * @param {string} plainText - Plain text
 * @param {string} hashedText - Hashed text
 * @param {string} algorithm - Hash algorithm (default: 'sha256')
 * @returns {boolean} True if values match
 */
const compareHash = (plainText, hashedText, algorithm = 'sha256') => {
  if (!plainText || !hashedText) {
    return false;
  }

  const hash = crypto.createHash(algorithm).update(plainText).digest('hex');
  return hash === hashedText;
};

/**
 * Generate HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @param {string} algorithm - HMAC algorithm (default: 'sha256')
 * @returns {string} HMAC signature
 */
const generateHMAC = (data, secret, algorithm = 'sha256') => {
  if (!data || !secret) {
    return '';
  }

  return crypto.createHmac(algorithm, secret).update(data).digest('hex');
};

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - HMAC signature
 * @param {string} secret - Secret key
 * @param {string} algorithm - HMAC algorithm (default: 'sha256')
 * @returns {boolean} True if signature is valid
 */
const verifyHMAC = (data, signature, secret, algorithm = 'sha256') => {
  if (!data || !signature || !secret) {
    return false;
  }

  const expectedSignature = generateHMAC(data, secret, algorithm);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

/**
 * Generate password hash (using bcrypt-style approach)
 * Note: For production, use bcrypt library instead
 * @param {string} password - Password to hash
 * @param {number} saltRounds - Number of salt rounds (default: 10)
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password, saltRounds = 10) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }

  // Generate salt
  const salt = crypto.randomBytes(16).toString('hex');

  // Hash password with salt
  const hash = crypto.pbkdf2Sync(password, salt, saltRounds * 1000, 64, 'sha512').toString('hex');

  return `${salt}:${hash}`;
};

/**
 * Verify password hash
 * @param {string} password - Plain password
 * @param {string} hashedPassword - Hashed password (format: salt:hash)
 * @param {number} saltRounds - Number of salt rounds (default: 10)
 * @returns {boolean} True if password matches
 */
const verifyPassword = (password, hashedPassword, saltRounds = 10) => {
  if (!password || !hashedPassword) {
    return false;
  }

  try {
    const [salt, hash] = hashedPassword.split(':');
    if (!salt || !hash) {
      return false;
    }

    const verifyHash = crypto.pbkdf2Sync(password, salt, saltRounds * 1000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash));
  } catch (error) {
    return false;
  }
};

/**
 * Generate API key
 * @param {number} length - Length of API key
 * @returns {string} API key
 */
const generateAPIKey = (length = 32) => {
  const prefix = 'gidi_';
  const randomPart = generateSecureToken(length);
  return `${prefix}${randomPart}`;
};

/**
 * Generate secret key
 * @param {number} length - Length of secret key
 * @returns {string} Secret key
 */
const generateSecretKey = (length = 64) => {
  return generateSecureToken(length);
};

/**
 * Generate UUID v4
 * @returns {string} UUID
 */
const generateUUID = () => {
  return crypto.randomUUID();
};

module.exports = {
  hashSHA256,
  hashMD5,
  generateRandomBytes,
  generateRandomString,
  generateSecureToken,
  encrypt,
  decrypt,
  compareHash,
  generateHMAC,
  verifyHMAC,
  hashPassword,
  verifyPassword,
  generateAPIKey,
  generateSecretKey,
  generateUUID,
};

