/**
 * JSON utility functions
 * Provides JSON parsing and stringification utilities
 */

/**
 * Safely parse JSON string
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
const safeParse = (jsonString, defaultValue = null) => {
  if (!jsonString || typeof jsonString !== 'string') {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Safely stringify object to JSON
 * @param {*} obj - Object to stringify
 * @param {*} defaultValue - Default value if stringification fails
 * @param {number|string} space - Space parameter for formatting
 * @returns {string} JSON string or default value
 */
const safeStringify = (obj, defaultValue = '{}', space = null) => {
  try {
    if (space !== null) {
      return JSON.stringify(obj, null, space);
    }
    return JSON.stringify(obj);
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Pretty print JSON
 * @param {*} obj - Object to stringify
 * @returns {string} Formatted JSON string
 */
const prettyPrint = (obj) => {
  return safeStringify(obj, '{}', 2);
};

/**
 * Deep clone object using JSON
 * Note: This method has limitations (no functions, dates, etc.)
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
const clone = (obj) => {
  return safeParse(safeStringify(obj));
};

/**
 * Check if string is valid JSON
 * @param {string} str - String to check
 * @returns {boolean} True if valid JSON
 */
const isValidJSON = (str) => {
  if (!str || typeof str !== 'string') {
    return false;
  }

  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get JSON path value
 * @param {Object} obj - Object to get value from
 * @param {string} path - JSON path (e.g., 'user.name')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Value at path or default value
 */
const getPath = (obj, path, defaultValue = undefined) => {
  if (!obj || typeof obj !== 'object' || !path) {
    return defaultValue;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object' || !current.hasOwnProperty(key)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current !== undefined ? current : defaultValue;
};

/**
 * Set JSON path value
 * @param {Object} obj - Object to set value in
 * @param {string} path - JSON path (e.g., 'user.name')
 * @param {*} value - Value to set
 * @returns {Object} Modified object
 */
const setPath = (obj, path, value) => {
  if (!obj || typeof obj !== 'object' || !path) {
    return obj;
  }

  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;

  for (const key of keys) {
    if (!current.hasOwnProperty(key) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
  return obj;
};

/**
 * Merge JSON objects
 * @param {...Object} objects - Objects to merge
 * @returns {Object} Merged object
 */
const merge = (...objects) => {
  const result = {};

  objects.forEach((obj) => {
    if (obj && typeof obj === 'object') {
      Object.assign(result, obj);
    }
  });

  return result;
};

/**
 * Extract specific keys from JSON object
 * @param {Object} obj - Object to extract from
 * @param {Array<string>} keys - Keys to extract
 * @returns {Object} Object with extracted keys
 */
const extract = (obj, keys) => {
  if (!obj || typeof obj !== 'object' || !Array.isArray(keys)) {
    return {};
  }

  const result = {};
  keys.forEach((key) => {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  });

  return result;
};

/**
 * Remove specific keys from JSON object
 * @param {Object} obj - Object to remove keys from
 * @param {Array<string>} keys - Keys to remove
 * @returns {Object} Object without removed keys
 */
const remove = (obj, keys) => {
  if (!obj || typeof obj !== 'object' || !Array.isArray(keys)) {
    return obj || {};
  }

  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });

  return result;
};

/**
 * Transform JSON object keys
 * @param {Object} obj - Object to transform
 * @param {Function} transformFn - Transform function
 * @returns {Object} Transformed object
 */
const transformKeys = (obj, transformFn) => {
  if (!obj || typeof obj !== 'object' || typeof transformFn !== 'function') {
    return obj || {};
  }

  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = transformFn(key);
      result[newKey] = obj[key];
    }
  }

  return result;
};

/**
 * Transform JSON object values
 * @param {Object} obj - Object to transform
 * @param {Function} transformFn - Transform function
 * @returns {Object} Transformed object
 */
const transformValues = (obj, transformFn) => {
  if (!obj || typeof obj !== 'object' || typeof transformFn !== 'function') {
    return obj || {};
  }

  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = transformFn(obj[key], key);
    }
  }

  return result;
};

/**
 * Flatten nested JSON object
 * @param {Object} obj - Object to flatten
 * @param {string} prefix - Key prefix
 * @param {Object} result - Result object
 * @returns {Object} Flattened object
 */
const flatten = (obj, prefix = '', result = {}) => {
  if (!obj || typeof obj !== 'object') {
    return result;
  }

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        flatten(obj[key], newKey, result);
      } else {
        result[newKey] = obj[key];
      }
    }
  }

  return result;
};

/**
 * Unflatten JSON object
 * @param {Object} obj - Object to unflatten
 * @returns {Object} Unflattened object
 */
const unflatten = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return {};
  }

  const result = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const keys = key.split('.');
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k] || typeof current[k] !== 'object') {
          current[k] = {};
        }
        current = current[k];
      }

      current[keys[keys.length - 1]] = obj[key];
    }
  }

  return result;
};

module.exports = {
  safeParse,
  safeStringify,
  prettyPrint,
  clone,
  isValidJSON,
  getPath,
  setPath,
  merge,
  extract,
  remove,
  transformKeys,
  transformValues,
  flatten,
  unflatten,
};

