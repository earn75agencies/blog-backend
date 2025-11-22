/**
 * String utility functions
 * Provides common string manipulation and formatting functions
 */

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @param {string} chars - Characters to use
 * @returns {string} Random string
 */
const randomString = (length = 10, chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a slug from a string
 * @param {string} text - Text to convert to slug
 * @returns {string} Slug string
 */
const slugify = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '') // Remove non-word characters
    .replace(/\-\-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Remove hyphens from start
    .replace(/-+$/, ''); // Remove hyphens from end
};

/**
 * Truncate string to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add if truncated
 * @returns {string} Truncated string
 */
const truncate = (text, length = 100, suffix = '...') => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= length) {
    return text;
  }

  return text.substring(0, length - suffix.length) + suffix;
};

/**
 * Capitalize first letter of string
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized string
 */
const capitalize = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Convert string to title case
 * @param {string} text - Text to convert
 * @returns {string} Title case string
 */
const titleCase = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

/**
 * Extract excerpt from HTML content
 * @param {string} html - HTML content
 * @param {number} length - Maximum length
 * @returns {string} Excerpt
 */
const extractExcerpt = (html, length = 200) => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, '');

  // Remove extra whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim();

  return truncate(cleaned, length);
};

/**
 * Count words in a string
 * @param {string} text - Text to count words in
 * @returns {number} Word count
 */
const wordCount = (text) => {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Remove HTML tags if present
  const cleaned = text.replace(/<[^>]*>/g, '');

  // Count words
  const words = cleaned.trim().split(/\s+/);
  return words.length;
};

/**
 * Estimate reading time in minutes
 * @param {string} text - Text to estimate
 * @param {number} wordsPerMinute - Average reading speed (default: 200)
 * @returns {number} Reading time in minutes
 */
const readingTime = (text, wordsPerMinute = 200) => {
  const words = wordCount(text);
  return Math.ceil(words / wordsPerMinute);
};

/**
 * Mask email address
 * @param {string} email - Email address
 * @returns {string} Masked email
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return email;
  }

  const maskedLocal = localPart.length > 2
    ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
    : '*'.repeat(localPart.length);

  return `${maskedLocal}@${domain}`;
};

/**
 * Format number with commas
 * @param {number} number - Number to format
 * @returns {string} Formatted number
 */
const formatNumber = (number) => {
  if (typeof number !== 'number') {
    return '';
  }

  return number.toLocaleString('en-US');
};

/**
 * Pluralize a word based on count
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional)
 * @returns {string} Pluralized word
 */
const pluralize = (count, singular, plural = null) => {
  if (count === 1) {
    return singular;
  }

  return plural || singular + 's';
};

/**
 * Generate initials from name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
const getInitials = (name) => {
  if (!name || typeof name !== 'string') {
    return '';
  }

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

/**
 * Remove HTML tags from string
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
const stripHTML = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return html.replace(/<[^>]*>/g, '').trim();
};

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
const escapeRegex = (string) => {
  if (!string || typeof string !== 'string') {
    return '';
  }

  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Check if string is a valid URL
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
 * Check if string is a valid email
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
 * Normalize whitespace in string
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
const normalizeWhitespace = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text.replace(/\s+/g, ' ').trim();
};

/**
 * Convert camelCase to kebab-case
 * @param {string} text - Text to convert
 * @returns {string} Kebab-case string
 */
const camelToKebab = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
};

/**
 * Convert kebab-case to camelCase
 * @param {string} text - Text to convert
 * @returns {string} CamelCase string
 */
const kebabToCamel = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * Remove diacritics from string
 * @param {string} text - Text to process
 * @returns {string} Text without diacritics
 */
const removeDiacritics = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
  randomString,
  slugify,
  truncate,
  capitalize,
  titleCase,
  extractExcerpt,
  wordCount,
  readingTime,
  maskEmail,
  formatNumber,
  pluralize,
  getInitials,
  stripHTML,
  escapeRegex,
  isValidURL,
  isValidEmail,
  normalizeWhitespace,
  camelToKebab,
  kebabToCamel,
  removeDiacritics,
  generateId,
};
