const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * File utility functions
 * Provides file system operations and file handling utilities
 */

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} File extension
 */
const getFileExtension = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  const ext = path.extname(filename);
  return ext.toLowerCase().replace('.', '');
};

/**
 * Get filename without extension
 * @param {string} filename - Filename
 * @returns {string} Filename without extension
 */
const getFilenameWithoutExtension = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  return path.basename(filename, path.extname(filename));
};

/**
 * Check if file exists
 * @param {string} filePath - File path
 * @returns {Promise<boolean>} True if file exists
 */
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get file size in bytes
 * @param {string} filePath - File path
 * @returns {Promise<number>} File size in bytes
 */
const getFileSize = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    throw new Error(`Failed to get file size: ${error.message}`);
  }
};

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file MIME type from extension
 * @param {string} filename - Filename or extension
 * @returns {string} MIME type
 */
const getMimeType = (filename) => {
  const ext = getFileExtension(filename);

  const mimeTypes = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    bmp: 'image/bmp',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Text
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
    xml: 'application/xml',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',

    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    avi: 'video/x-msvideo',

    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };

  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * Validate file type
 * @param {string} filename - Filename
 * @param {Array<string>} allowedTypes - Allowed file extensions
 * @returns {boolean} True if file type is allowed
 */
const isValidFileType = (filename, allowedTypes) => {
  if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) {
    return true;
  }

  const ext = getFileExtension(filename);
  return allowedTypes.map((t) => t.toLowerCase()).includes(ext.toLowerCase());
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {boolean} True if file size is valid
 */
const isValidFileSize = (size, maxSize) => {
  return size <= maxSize;
};

/**
 * Generate unique filename
 * @param {string} originalFilename - Original filename
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalFilename, prefix = '') => {
  const ext = getFileExtension(originalFilename);
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  const baseName = prefix ? `${prefix}-` : '';

  return `${baseName}${timestamp}-${random}.${ext}`;
};

/**
 * Create directory if it doesn't exist
 * @param {string} dirPath - Directory path
 * @returns {Promise<void>}
 */
const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Delete file
 * @param {string} filePath - File path
 * @returns {Promise<void>}
 */
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Copy file
 * @param {string} source - Source file path
 * @param {string} destination - Destination file path
 * @returns {Promise<void>}
 */
const copyFile = async (source, destination) => {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destination);
    await ensureDirectoryExists(destDir);

    await fs.copyFile(source, destination);
  } catch (error) {
    throw new Error(`Failed to copy file: ${error.message}`);
  }
};

/**
 * Move file
 * @param {string} source - Source file path
 * @param {string} destination - Destination file path
 * @returns {Promise<void>}
 */
const moveFile = async (source, destination) => {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destination);
    await ensureDirectoryExists(destDir);

    await fs.rename(source, destination);
  } catch (error) {
    throw new Error(`Failed to move file: ${error.message}`);
  }
};

/**
 * Read file as string
 * @param {string} filePath - File path
 * @param {string} encoding - File encoding (default: 'utf8')
 * @returns {Promise<string>} File contents
 */
const readFile = async (filePath, encoding = 'utf8') => {
  try {
    return await fs.readFile(filePath, encoding);
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
};

/**
 * Write file
 * @param {string} filePath - File path
 * @param {string|Buffer} data - Data to write
 * @param {string} encoding - File encoding (default: 'utf8')
 * @returns {Promise<void>}
 */
const writeFile = async (filePath, data, encoding = 'utf8') => {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await ensureDirectoryExists(dir);

    await fs.writeFile(filePath, data, encoding);
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
};

/**
 * Get file stats
 * @param {string} filePath - File path
 * @returns {Promise<Object>} File stats
 */
const getFileStats = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  } catch (error) {
    throw new Error(`Failed to get file stats: ${error.message}`);
  }
};

/**
 * List files in directory
 * @param {string} dirPath - Directory path
 * @param {boolean} recursive - Include subdirectories
 * @returns {Promise<Array<string>>} Array of file paths
 */
const listFiles = async (dirPath, recursive = false) => {
  try {
    const files = [];
    const items = await fs.readdir(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = await fs.stat(fullPath);

      if (stats.isFile()) {
        files.push(fullPath);
      } else if (stats.isDirectory() && recursive) {
        const subFiles = await listFiles(fullPath, true);
        files.push(...subFiles);
      }
    }

    return files;
  } catch (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }
};

module.exports = {
  getFileExtension,
  getFilenameWithoutExtension,
  fileExists,
  getFileSize,
  formatFileSize,
  getMimeType,
  isValidFileType,
  isValidFileSize,
  generateUniqueFilename,
  ensureDirectoryExists,
  deleteFile,
  copyFile,
  moveFile,
  readFile,
  writeFile,
  getFileStats,
  listFiles,
};

