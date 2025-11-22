const { validationResult } = require('express-validator');

/**
 * Validation middleware
 * Checks for validation errors from express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));

    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errorMessages,
    });
  }

  next();
};

/**
 * Validation middleware with custom error handling
 * @param {Function} errorFormatter - Custom error formatter function
 * @returns {Function} Validation middleware
 */
const validateWithFormatter = (errorFormatter) => {
  return (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const formattedErrors = errorFormatter
        ? errorFormatter(errors.array())
        : errors.array();

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    next();
  };
};

/**
 * Async validation middleware
 * For async validators that need to check database or external services
 * @param {Array} validators - Array of validator functions
 * @returns {Function} Validation middleware
 */
const asyncValidate = (validators) => {
  return async (req, res, next) => {
    try {
      // Run all validators
      await Promise.all(validators.map((validator) => validator.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => ({
          field: error.param,
          message: error.msg,
          value: error.value,
        }));

        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errorMessages,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Conditional validation middleware
 * Only validates if condition is met
 * @param {Function} condition - Condition function
 * @param {Array} validators - Array of validator functions
 * @returns {Function} Validation middleware
 */
const conditionalValidate = (condition, validators) => {
  return (req, res, next) => {
    if (condition(req)) {
      return validate(req, res, next);
    }
    next();
  };
};

/**
 * Schema validation middleware
 * Validates request against JSON schema
 * @param {Object} schema - JSON schema object
 * @returns {Function} Validation middleware
 */
const schemaValidate = (schema) => {
  return (req, res, next) => {
    try {
      // Simple schema validation (for production, use ajv or similar)
      const validateSchema = (data, schemaObj) => {
        for (const key in schemaObj) {
          if (schemaObj.hasOwnProperty(key)) {
            const rule = schemaObj[key];
            const value = data[key];

            // Required check
            if (rule.required && (value === undefined || value === null || value === '')) {
              return { valid: false, field: key, message: `${key} is required` };
            }

            // Type check
            if (value !== undefined && value !== null && rule.type) {
              const expectedType = rule.type;
              const actualType = Array.isArray(value) ? 'array' : typeof value;

              if (actualType !== expectedType) {
                return { valid: false, field: key, message: `${key} must be of type ${expectedType}` };
              }
            }

            // Min/Max length check
            if (rule.minLength && value && value.length < rule.minLength) {
              return { valid: false, field: key, message: `${key} must be at least ${rule.minLength} characters` };
            }

            if (rule.maxLength && value && value.length > rule.maxLength) {
              return { valid: false, field: key, message: `${key} cannot exceed ${rule.maxLength} characters` };
            }

            // Min/Max value check
            if (rule.min !== undefined && value < rule.min) {
              return { valid: false, field: key, message: `${key} must be at least ${rule.min}` };
            }

            if (rule.max !== undefined && value > rule.max) {
              return { valid: false, field: key, message: `${key} cannot exceed ${rule.max}` };
            }

            // Pattern check
            if (rule.pattern && value && !rule.pattern.test(value)) {
              return { valid: false, field: key, message: `${key} format is invalid` };
            }

            // Enum check
            if (rule.enum && !rule.enum.includes(value)) {
              return { valid: false, field: key, message: `${key} must be one of: ${rule.enum.join(', ')}` };
            }
          }
        }
        return { valid: true };
      };

      // Validate request body
      if (schema.body) {
        const result = validateSchema(req.body, schema.body);
        if (!result.valid) {
          return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: [{ field: result.field, message: result.message }],
          });
        }
      }

      // Validate query parameters
      if (schema.query) {
        const result = validateSchema(req.query, schema.query);
        if (!result.valid) {
          return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: [{ field: result.field, message: result.message }],
          });
        }
      }

      // Validate route parameters
      if (schema.params) {
        const result = validateSchema(req.params, schema.params);
        if (!result.valid) {
          return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: [{ field: result.field, message: result.message }],
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validate;
module.exports.validateWithFormatter = validateWithFormatter;
module.exports.asyncValidate = asyncValidate;
module.exports.conditionalValidate = conditionalValidate;
module.exports.schemaValidate = schemaValidate;
