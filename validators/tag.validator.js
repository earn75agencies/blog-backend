const { body } = require('express-validator');

/**
 * Create tag validation rules
 */
exports.createTagValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tag name is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('Tag name must be between 2 and 30 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Tag name can only contain letters and numbers'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
];

/**
 * Update tag validation rules
 */
exports.updateTagValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Tag name must be between 2 and 30 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Tag name can only contain letters and numbers'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
];

