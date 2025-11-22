/**
 * Array utility functions
 * Provides common array manipulation functions
 */

/**
 * Remove duplicates from array
 * @param {Array} array - Array to process
 * @returns {Array} Array without duplicates
 */
const removeDuplicates = (array) => {
  if (!Array.isArray(array)) {
    return [];
  }

  return [...new Set(array)];
};

/**
 * Remove duplicates from array of objects by key
 * @param {Array} array - Array to process
 * @param {string} key - Key to check for duplicates
 * @returns {Array} Array without duplicates
 */
const removeDuplicatesByKey = (array, key) => {
  if (!Array.isArray(array) || !key) {
    return array || [];
  }

  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

/**
 * Shuffle array
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
const shuffle = (array) => {
  if (!Array.isArray(array)) {
    return [];
  }

  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Get random item from array
 * @param {Array} array - Array to get item from
 * @returns {*} Random item
 */
const getRandomItem = (array) => {
  if (!Array.isArray(array) || array.length === 0) {
    return null;
  }

  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Get random items from array
 * @param {Array} array - Array to get items from
 * @param {number} count - Number of items to get
 * @returns {Array} Random items
 */
const getRandomItems = (array, count = 1) => {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }

  const shuffled = shuffle(array);
  return shuffled.slice(0, Math.min(count, array.length));
};

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} Array of chunks
 */
const chunk = (array, size) => {
  if (!Array.isArray(array) || size <= 0) {
    return [];
  }

  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Flatten nested array
 * @param {Array} array - Array to flatten
 * @param {number} depth - Flattening depth
 * @returns {Array} Flattened array
 */
const flatten = (array, depth = Infinity) => {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.flat(depth);
};

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key or function to group by
 * @returns {Object} Grouped object
 */
const groupBy = (array, key) => {
  if (!Array.isArray(array)) {
    return {};
  }

  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
};

/**
 * Sort array by key
 * @param {Array} array - Array to sort
 * @param {string} key - Key to sort by
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted array
 */
const sortBy = (array, key, order = 'asc') => {
  if (!Array.isArray(array)) {
    return [];
  }

  const sorted = [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) {
      return order === 'asc' ? -1 : 1;
    }
    if (aVal > bVal) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });

  return sorted;
};

/**
 * Filter array by multiple conditions
 * @param {Array} array - Array to filter
 * @param {Object} filters - Filter conditions
 * @returns {Array} Filtered array
 */
const filterBy = (array, filters) => {
  if (!Array.isArray(array) || typeof filters !== 'object') {
    return array || [];
  }

  return array.filter((item) => {
    for (const key in filters) {
      if (filters.hasOwnProperty(key)) {
        const filterValue = filters[key];
        const itemValue = item[key];

        // Handle different filter types
        if (Array.isArray(filterValue)) {
          if (!filterValue.includes(itemValue)) {
            return false;
          }
        } else if (typeof filterValue === 'object' && filterValue !== null) {
          // Handle object filters like { $gte: 10 }
          if (filterValue.$gte !== undefined && itemValue < filterValue.$gte) {
            return false;
          }
          if (filterValue.$lte !== undefined && itemValue > filterValue.$lte) {
            return false;
          }
          if (filterValue.$gt !== undefined && itemValue <= filterValue.$gt) {
            return false;
          }
          if (filterValue.$lt !== undefined && itemValue >= filterValue.$lt) {
            return false;
          }
          if (filterValue.$ne !== undefined && itemValue === filterValue.$ne) {
            return false;
          }
          if (filterValue.$in !== undefined && !filterValue.$in.includes(itemValue)) {
            return false;
          }
        } else {
          if (itemValue !== filterValue) {
            return false;
          }
        }
      }
    }
    return true;
  });
};

/**
 * Paginate array
 * @param {Array} array - Array to paginate
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated result
 */
const paginate = (array, page = 1, limit = 10) => {
  if (!Array.isArray(array)) {
    return {
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  const total = array.length;
  const pages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const items = array.slice(skip, skip + limit);

  return {
    items,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
      nextPage: page < pages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
  };
};

/**
 * Get unique values from array
 * @param {Array} array - Array to process
 * @returns {Array} Array of unique values
 */
const unique = (array) => {
  if (!Array.isArray(array)) {
    return [];
  }

  return removeDuplicates(array);
};

/**
 * Get intersection of two arrays
 * @param {Array} array1 - First array
 * @param {Array} array2 - Second array
 * @returns {Array} Intersection
 */
const intersection = (array1, array2) => {
  if (!Array.isArray(array1) || !Array.isArray(array2)) {
    return [];
  }

  return array1.filter((value) => array2.includes(value));
};

/**
 * Get union of two arrays
 * @param {Array} array1 - First array
 * @param {Array} array2 - Second array
 * @returns {Array} Union
 */
const union = (array1, array2) => {
  if (!Array.isArray(array1) || !Array.isArray(array2)) {
    return [];
  }

  return removeDuplicates([...array1, ...array2]);
};

/**
 * Get difference of two arrays
 * @param {Array} array1 - First array
 * @param {Array} array2 - Second array
 * @returns {Array} Difference
 */
const difference = (array1, array2) => {
  if (!Array.isArray(array1) || !Array.isArray(array2)) {
    return array1 || [];
  }

  return array1.filter((value) => !array2.includes(value));
};

/**
 * Find item in array by condition
 * @param {Array} array - Array to search
 * @param {Function} predicate - Search function
 * @returns {*} Found item or null
 */
const findItem = (array, predicate) => {
  if (!Array.isArray(array) || typeof predicate !== 'function') {
    return null;
  }

  return array.find(predicate) || null;
};

/**
 * Find all items in array by condition
 * @param {Array} array - Array to search
 * @param {Function} predicate - Search function
 * @returns {Array} Found items
 */
const findAllItems = (array, predicate) => {
  if (!Array.isArray(array) || typeof predicate !== 'function') {
    return [];
  }

  return array.filter(predicate);
};

/**
 * Count items in array by condition
 * @param {Array} array - Array to count
 * @param {Function} predicate - Count function
 * @returns {number} Count
 */
const countItems = (array, predicate) => {
  if (!Array.isArray(array)) {
    return 0;
  }

  if (typeof predicate === 'function') {
    return array.filter(predicate).length;
  }

  return array.length;
};

/**
 * Sum array values
 * @param {Array} array - Array to sum
 * @param {string|Function} key - Key or function to get value
 * @returns {number} Sum
 */
const sum = (array, key = null) => {
  if (!Array.isArray(array)) {
    return 0;
  }

  return array.reduce((total, item) => {
    let value = item;
    if (key) {
      value = typeof key === 'function' ? key(item) : item[key];
    }
    return total + (parseFloat(value) || 0);
  }, 0);
};

/**
 * Get average of array values
 * @param {Array} array - Array to average
 * @param {string|Function} key - Key or function to get value
 * @returns {number} Average
 */
const average = (array, key = null) => {
  if (!Array.isArray(array) || array.length === 0) {
    return 0;
  }

  const total = sum(array, key);
  return total / array.length;
};

/**
 * Get min value from array
 * @param {Array} array - Array to process
 * @param {string|Function} key - Key or function to get value
 * @returns {number} Minimum value
 */
const min = (array, key = null) => {
  if (!Array.isArray(array) || array.length === 0) {
    return null;
  }

  let values = array;
  if (key) {
    values = array.map((item) => (typeof key === 'function' ? key(item) : item[key]));
  }

  return Math.min(...values.map((v) => parseFloat(v) || 0));
};

/**
 * Get max value from array
 * @param {Array} array - Array to process
 * @param {string|Function} key - Key or function to get value
 * @returns {number} Maximum value
 */
const max = (array, key = null) => {
  if (!Array.isArray(array) || array.length === 0) {
    return null;
  }

  let values = array;
  if (key) {
    values = array.map((item) => (typeof key === 'function' ? key(item) : item[key]));
  }

  return Math.max(...values.map((v) => parseFloat(v) || 0));
};

/**
 * Sample array (get random subset)
 * @param {Array} array - Array to sample
 * @param {number} size - Sample size
 * @returns {Array} Sampled array
 */
const sample = (array, size = 1) => {
  return getRandomItems(array, size);
};

/**
 * Partition array into two arrays based on condition
 * @param {Array} array - Array to partition
 * @param {Function} predicate - Partition function
 * @returns {Array} Array with two arrays [trueItems, falseItems]
 */
const partition = (array, predicate) => {
  if (!Array.isArray(array) || typeof predicate !== 'function') {
    return [[], []];
  }

  const trueItems = [];
  const falseItems = [];

  array.forEach((item) => {
    if (predicate(item)) {
      trueItems.push(item);
    } else {
      falseItems.push(item);
    }
  });

  return [trueItems, falseItems];
};

/**
 * Zip arrays together
 * @param {...Array} arrays - Arrays to zip
 * @returns {Array} Zipped array
 */
const zip = (...arrays) => {
  if (arrays.length === 0) {
    return [];
  }

  const maxLength = Math.max(...arrays.map((arr) => arr.length));
  const result = [];

  for (let i = 0; i < maxLength; i++) {
    result.push(arrays.map((arr) => arr[i]));
  }

  return result;
};

/**
 * Unzip array
 * @param {Array} array - Array to unzip
 * @returns {Array} Unzipped arrays
 */
const unzip = (array) => {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }

  const maxLength = Math.max(...array.map((arr) => arr.length));
  const result = [];

  for (let i = 0; i < maxLength; i++) {
    result.push(array.map((arr) => arr[i]));
  }

  return result;
};

/**
 * Compact array (remove falsy values)
 * @param {Array} array - Array to compact
 * @returns {Array} Compacted array
 */
const compact = (array) => {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.filter((item) => Boolean(item));
};

/**
 * Get first N items from array
 * @param {Array} array - Array to process
 * @param {number} n - Number of items
 * @returns {Array} First N items
 */
const take = (array, n = 1) => {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.slice(0, n);
};

/**
 * Get last N items from array
 * @param {Array} array - Array to process
 * @param {number} n - Number of items
 * @returns {Array} Last N items
 */
const takeLast = (array, n = 1) => {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.slice(-n);
};

/**
 * Skip first N items from array
 * @param {Array} array - Array to process
 * @param {number} n - Number of items to skip
 * @returns {Array} Array without first N items
 */
const skip = (array, n = 1) => {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.slice(n);
};

module.exports = {
  removeDuplicates,
  removeDuplicatesByKey,
  shuffle,
  getRandomItem,
  getRandomItems,
  chunk,
  flatten,
  groupBy,
  sortBy,
  filterBy,
  paginate,
  unique,
  intersection,
  union,
  difference,
  findItem,
  findAllItems,
  countItems,
  sum,
  average,
  min,
  max,
  sample,
  partition,
  zip,
  unzip,
  compact,
  take,
  takeLast,
  skip,
};

