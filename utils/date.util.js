/**
 * Date utility functions
 * Provides common date manipulation and formatting functions
 */

/**
 * Format date to string
 * @param {Date} date - Date object
 * @param {string} format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} Formatted date string
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) {
    return '';
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {Date} date - Date object
 * @returns {string} Relative time string
 */
const getRelativeTime = (date) => {
  if (!date) {
    return '';
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  const now = new Date();
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else if (weeks < 4) {
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  }
};

/**
 * Check if date is today
 * @param {Date} date - Date object
 * @returns {boolean} True if date is today
 */
const isToday = (date) => {
  if (!date) {
    return false;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return false;
  }

  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if date is yesterday
 * @param {Date} date - Date object
 * @returns {boolean} True if date is yesterday
 */
const isYesterday = (date) => {
  if (!date) {
    return false;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return false;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Check if date is in the past
 * @param {Date} date - Date object
 * @returns {boolean} True if date is in the past
 */
const isPast = (date) => {
  if (!date) {
    return false;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return false;
  }

  return d < new Date();
};

/**
 * Check if date is in the future
 * @param {Date} date - Date object
 * @returns {boolean} True if date is in the future
 */
const isFuture = (date) => {
  if (!date) {
    return false;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return false;
  }

  return d > new Date();
};

/**
 * Add days to date
 * @param {Date} date - Date object
 * @param {number} days - Number of days to add
 * @returns {Date} New date object
 */
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Add months to date
 * @param {Date} date - Date object
 * @param {number} months - Number of months to add
 * @returns {Date} New date object
 */
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Add years to date
 * @param {Date} date - Date object
 * @param {number} years - Number of years to add
 * @returns {Date} New date object
 */
const addYears = (date, years) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
};

/**
 * Get start of day
 * @param {Date} date - Date object
 * @returns {Date} Start of day
 */
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day
 * @param {Date} date - Date object
 * @returns {Date} End of day
 */
const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get difference in days between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Difference in days
 */
const diffInDays = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2 - d1);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Get difference in hours between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Difference in hours
 */
const diffInHours = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2 - d1);
  return Math.floor(diff / (1000 * 60 * 60));
};

/**
 * Get difference in minutes between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Difference in minutes
 */
const diffInMinutes = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2 - d1);
  return Math.floor(diff / (1000 * 60));
};

/**
 * Check if date is within date range
 * @param {Date} date - Date to check
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean} True if date is within range
 */
const isInRange = (date, startDate, endDate) => {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  return d >= start && d <= end;
};

/**
 * Get ISO date string
 * @param {Date} date - Date object
 * @returns {string} ISO date string
 */
const toISOString = (date) => {
  if (!date) {
    return '';
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  return d.toISOString();
};

/**
 * Parse date from string
 * @param {string} dateString - Date string
 * @returns {Date|null} Date object or null if invalid
 */
const parseDate = (dateString) => {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/**
 * Get age from birthdate
 * @param {Date} birthdate - Birthdate
 * @returns {number} Age in years
 */
const getAge = (birthdate) => {
  if (!birthdate) {
    return 0;
  }

  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

/**
 * Get date range for filter
 * @param {string} period - Period (today, week, month, year, all)
 * @returns {Object} Date range with start and end dates
 */
const getDateRange = (period = 'all') => {
  const today = new Date();
  let startDate, endDate;

  switch (period.toLowerCase()) {
    case 'today':
      startDate = startOfDay(today);
      endDate = endOfDay(today);
      break;
    case 'week':
      startDate = startOfDay(addDays(today, -7));
      endDate = endOfDay(today);
      break;
    case 'month':
      startDate = startOfDay(addMonths(today, -1));
      endDate = endOfDay(today);
      break;
    case 'year':
      startDate = startOfDay(addYears(today, -1));
      endDate = endOfDay(today);
      break;
    case 'all':
    default:
      startDate = null;
      endDate = null;
      break;
  }

  return { startDate, endDate };
};

module.exports = {
  formatDate,
  getRelativeTime,
  isToday,
  isYesterday,
  isPast,
  isFuture,
  addDays,
  addMonths,
  addYears,
  startOfDay,
  endOfDay,
  diffInDays,
  diffInHours,
  diffInMinutes,
  isInRange,
  toISOString,
  parseDate,
  getAge,
  getDateRange,
};
