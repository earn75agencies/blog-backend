/**
 * Object utility functions
 * Provides common object manipulation functions
 */

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item));
  }

  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
};

/**
 * Merge objects deeply
 * @param {...Object} objects - Objects to merge
 * @returns {Object} Merged object
 */
const deepMerge = (...objects) => {
  const result = {};

  objects.forEach((obj) => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (
            result[key] &&
            typeof result[key] === 'object' &&
            !Array.isArray(result[key]) &&
            typeof obj[key] === 'object' &&
            !Array.isArray(obj[key])
          ) {
            result[key] = deepMerge(result[key], obj[key]);
          } else {
            result[key] = obj[key];
          }
        }
      }
    }
  });

  return result;
};

/**
 * Pick properties from object
 * @param {Object} obj - Object to pick from
 * @param {Array<string>} keys - Keys to pick
 * @returns {Object} Object with picked properties
 */
const pick = (obj, keys) => {
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
 * Omit properties from object
 * @param {Object} obj - Object to omit from
 * @param {Array<string>} keys - Keys to omit
 * @returns {Object} Object without omitted properties
 */
const omit = (obj, keys) => {
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
 * Check if object has property
 * @param {Object} obj - Object to check
 * @param {string} path - Property path (supports dot notation)
 * @returns {boolean} True if property exists
 */
const has = (obj, path) => {
  if (!obj || typeof obj !== 'object' || !path) {
    return false;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || !current.hasOwnProperty(key)) {
      return false;
    }
    current = current[key];
  }

  return true;
};

/**
 * Get value from object by path
 * @param {Object} obj - Object to get value from
 * @param {string} path - Property path (supports dot notation)
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Value or default value
 */
const get = (obj, path, defaultValue = undefined) => {
  if (!obj || typeof obj !== 'object' || !path) {
    return defaultValue;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || !current.hasOwnProperty(key)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current !== undefined ? current : defaultValue;
};

/**
 * Set value in object by path
 * @param {Object} obj - Object to set value in
 * @param {string} path - Property path (supports dot notation)
 * @param {*} value - Value to set
 * @returns {Object} Modified object
 */
const set = (obj, path, value) => {
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
 * Remove property from object by path
 * @param {Object} obj - Object to remove property from
 * @param {string} path - Property path (supports dot notation)
 * @returns {Object} Modified object
 */
const unset = (obj, path) => {
  if (!obj || typeof obj !== 'object' || !path) {
    return obj;
  }

  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;

  for (const key of keys) {
    if (!current.hasOwnProperty(key)) {
      return obj;
    }
    current = current[key];
  }

  if (current.hasOwnProperty(lastKey)) {
    delete current[lastKey];
  }

  return obj;
};

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if object is empty
 */
const isEmpty = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return true;
  }

  return Object.keys(obj).length === 0;
};

/**
 * Check if object is not empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if object is not empty
 */
const isNotEmpty = (obj) => {
  return !isEmpty(obj);
};

/**
 * Get object keys
 * @param {Object} obj - Object to get keys from
 * @returns {Array<string>} Array of keys
 */
const keys = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return [];
  }

  return Object.keys(obj);
};

/**
 * Get object values
 * @param {Object} obj - Object to get values from
 * @returns {Array} Array of values
 */
const values = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return [];
  }

  return Object.values(obj);
};

/**
 * Get object entries
 * @param {Object} obj - Object to get entries from
 * @returns {Array} Array of [key, value] pairs
 */
const entries = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return [];
  }

  return Object.entries(obj);
};

/**
 * Invert object (swap keys and values)
 * @param {Object} obj - Object to invert
 * @returns {Object} Inverted object
 */
const invert = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return {};
  }

  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[obj[key]] = key;
    }
  }

  return result;
};

/**
 * Map object values
 * @param {Object} obj - Object to map
 * @param {Function} fn - Mapping function
 * @returns {Object} Mapped object
 */
const mapValues = (obj, fn) => {
  if (!obj || typeof obj !== 'object' || typeof fn !== 'function') {
    return {};
  }

  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = fn(obj[key], key, obj);
    }
  }

  return result;
};

/**
 * Map object keys
 * @param {Object} obj - Object to map
 * @param {Function} fn - Mapping function
 * @returns {Object} Mapped object
 */
const mapKeys = (obj, fn) => {
  if (!obj || typeof obj !== 'object' || typeof fn !== 'function') {
    return {};
  }

  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = fn(key, obj[key], obj);
      result[newKey] = obj[key];
    }
  }

  return result;
};

/**
 * Filter object properties
 * @param {Object} obj - Object to filter
 * @param {Function} predicate - Filter function
 * @returns {Object} Filtered object
 */
const filter = (obj, predicate) => {
  if (!obj || typeof obj !== 'object' || typeof predicate !== 'function') {
    return {};
  }

  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && predicate(obj[key], key, obj)) {
      result[key] = obj[key];
    }
  }

  return result;
};

/**
 * Transform object keys to camelCase
 * @param {Object} obj - Object to transform
 * @returns {Object} Transformed object
 */
const camelCaseKeys = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return {};
  }

  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = obj[key];
    }
  }

  return result;
};

/**
 * Transform object keys to snake_case
 * @param {Object} obj - Object to transform
 * @returns {Object} Transformed object
 */
const snakeCaseKeys = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return {};
  }

  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = obj[key];
    }
  }

  return result;
};

/**
 * Get size of object
 * @param {Object} obj - Object to get size of
 * @returns {number} Number of properties
 */
const size = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return 0;
  }

  return Object.keys(obj).length;
};

/**
 * Check if two objects are equal
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {boolean} True if objects are equal
 */
const isEqual = (obj1, obj2) => {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == null || obj2 == null) {
    return false;
  }

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false;
    }

    if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
      if (!isEqual(obj1[key], obj2[key])) {
        return false;
      }
    } else if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
};

/**
 * Flatten nested object
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

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
        flatten(obj[key], newKey, result);
      } else {
        result[newKey] = obj[key];
      }
    }
  }

  return result;
};

/**
 * Unflatten object (reverse of flatten)
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

/**
 * Defaults object (fill in missing properties)
 * @param {Object} obj - Object to fill
 * @param {Object} defaults - Default values
 * @returns {Object} Object with defaults applied
 */
const defaults = (obj, defaults) => {
  if (!obj || typeof obj !== 'object') {
    return defaults || {};
  }

  if (!defaults || typeof defaults !== 'object') {
    return obj;
  }

  const result = { ...defaults };
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  }

  return result;
};

module.exports = {
  deepClone,
  deepMerge,
  pick,
  omit,
  has,
  get,
  set,
  unset,
  isEmpty,
  isNotEmpty,
  keys,
  values,
  entries,
  invert,
  mapValues,
  mapKeys,
  filter,
  camelCaseKeys,
  snakeCaseKeys,
  size,
  isEqual,
  flatten,
  unflatten,
  defaults,
};

