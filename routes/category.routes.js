const express = require('express');
const {
  getCategories,
  getRootCategories,
  getCategoryChildren,
  searchCategories,
  getCategoryHierarchy,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryPosts,
} = require('../controllers/category.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createCategoryValidation, updateCategoryValidation } = require('../validators/category.validator');
const { upload } = require('../config/cloudinary.config');

const router = express.Router();

// Public routes - order matters! More specific routes first
router.get('/search', optionalAuth, searchCategories);
router.get('/children/:id', optionalAuth, getCategoryChildren);
router.get('/hierarchy', optionalAuth, getCategoryHierarchy);
router.get('/', optionalAuth, (req, res, next) => {
  // Route to root categories if root=true, otherwise get all
  if (req.query.root === 'true') {
    return getRootCategories(req, res, next);
  }
  return getCategories(req, res, next);
});
router.get('/:id/posts', optionalAuth, getCategoryPosts);
router.get('/:slug', optionalAuth, getCategory);

// Protected routes (admin only)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  upload.single('image'),
  createCategoryValidation,
  validate,
  createCategory
);
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  upload.single('image'),
  updateCategoryValidation,
  validate,
  updateCategory
);
router.delete('/:id', authenticate, authorize('admin'), deleteCategory);

module.exports = router;

