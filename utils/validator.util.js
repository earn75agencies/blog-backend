/**
 * Validator utility functions
 * Provides common validation functions
 */

/**
 * Check if value is empty
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
};

/**
 * Check if value is not empty
 * @param {*} value - Value to check
 * @returns {boolean} True if not empty
 */
const isNotEmpty = (value) => {
  return !isEmpty(value);
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
const isValidURL = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }

  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate phone number (basic)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone
 */
const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Check if it's all digits and has reasonable length
  return /^\d{10,15}$/.test(cleaned);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
const isValidPassword = (password, options = {}) => {
  const {
    minLength = 6,
    requireUppercase = false,
    requireLowercase = false,
    requireNumbers = false,
    requireSpecialChars = false,
  } = options;

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {Object} Validation result
 */
const isValidUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, errors: ['Username is required'] };
  }

  const errors = [];

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (username.length > 30) {
    errors.push('Username cannot exceed 30 characters');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate slug
 * @param {string} slug - Slug to validate
 * @returns {boolean} True if valid slug
 */
const isValidSlug = (slug) => {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Slug should only contain lowercase letters, numbers, and hyphens
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

/**
 * Validate IP address
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IP
 */
const isValidIP = (ip) => {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(ip);
};

/**
 * Validate credit card number (Luhn algorithm)
 * @param {string} cardNumber - Credit card number
 * @returns {boolean} True if valid card number
 */
const isValidCreditCard = (cardNumber) => {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return false;
  }

  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s\-]/g, '');

  // Check if it's all digits
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Validate date string
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date
 */
const isValidDate = (dateString) => {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Validate number in range
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if in range
 */
const isInRange = (value, min, max) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return false;
  }

  return num >= min && num <= max;
};

/**
 * Validate array
 * @param {*} value - Value to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {boolean} True if valid array
 */
const isValidArray = (value, minLength = 0, maxLength = Infinity) => {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.length >= minLength && value.length <= maxLength;
};

/**
 * Validate enum value
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - Allowed values
 * @returns {boolean} True if valid enum value
 */
const isValidEnum = (value, allowedValues) => {
  if (!Array.isArray(allowedValues) || allowedValues.length === 0) {
    return false;
  }

  return allowedValues.includes(value);
};

/**
 * Validate file extension
 * @param {string} filename - Filename
 * @param {Array<string>} allowedExtensions - Allowed extensions
 * @returns {boolean} True if valid extension
 */
const isValidFileExtension = (filename, allowedExtensions) => {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  if (!Array.isArray(allowedExtensions) || allowedExtensions.length === 0) {
    return true;
  }

  const ext = filename.split('.').pop().toLowerCase();
  return allowedExtensions.map((e) => e.toLowerCase()).includes(ext);
};

module.exports = {
  isEmpty,
  isNotEmpty,
  isValidEmail,
  isValidURL,
  isValidObjectId,
  isValidPhone,
  isValidPassword,
  isValidUsername,
  isValidSlug,
  isValidIP,
  isValidCreditCard,
  isValidDate,
  isInRange,
  isValidArray,
  isValidEnum,
  isValidFileExtension,
};
