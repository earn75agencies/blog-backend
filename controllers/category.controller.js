const Category = require('../models/Category.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const CacheUtil = require('../utils/cache.util');
const { uploadImage, deleteImage } = require('../config/cloudinary.config');

/**
 * @desc    Get all categories (backward compatible)
 * @route   GET /api/categories
 * @access  Public
 */
exports.getCategories = asyncHandler(async (req, res) => {
  const { level, parent, featured, limit } = req.query;
  const cacheKey = `categories:all:${level || 'all'}:${parent || 'all'}:${featured || 'all'}`;
  
  // Try to get from cache
  let categories = CacheUtil.get(cacheKey);
  
  if (!categories) {
    const query = { isActive: true };
    
    if (level !== undefined) {
      query.level = parseInt(level);
    }
    
    if (parent !== undefined) {
      if (parent === 'null' || parent === '') {
        query.parent = null;
      } else {
        query.parent = parent;
      }
    }
    
    if (featured === 'true') {
      query.featured = true;
    }
    
    let queryBuilder = Category.find(query)
      .sort({ order: 1, name: 1 });
    
    if (limit) {
      queryBuilder = queryBuilder.limit(parseInt(limit));
    }
    
    categories = await queryBuilder.lean(); // Use lean() for better performance
    
    // Cache for 10 minutes
    CacheUtil.set(cacheKey, categories, 600);
  }

  res.json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

/**
 * @desc    Get root categories (Materialized Path optimized)
 * @route   GET /api/categories?root=true&limit=50
 * @access  Public
 */
exports.getRootCategories = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const featured = req.query.featured === 'true';
  
  const cacheKey = `categories:roots:${limit}:${featured}`;
  let categories = CacheUtil.get(cacheKey);
  
  if (!categories) {
    categories = await Category.getRoots({ featured, limit });
    CacheUtil.set(cacheKey, categories, 600); // 10 min cache
  }

  res.json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

/**
 * @desc    Get children of a category
 * @route   GET /api/categories/children/:id?limit=50
 * @access  Public
 */
exports.getCategoryChildren = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const parentId = req.params.id;
  
  const cacheKey = `categories:children:${parentId}:${limit}`;
  let categories = CacheUtil.get(cacheKey);
  
  if (!categories) {
    categories = await Category.getChildren(parentId, { limit });
    CacheUtil.set(cacheKey, categories, 300); // 5 min cache
  }

  res.json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

/**
 * @desc    Search categories by name
 * @route   GET /api/categories/search?q=&limit=20
 * @access  Public
 */
exports.searchCategories = asyncHandler(async (req, res) => {
  const query = req.query.q || '';
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  
  if (!query || query.length < 2) {
    return res.json({
      status: 'success',
      results: 0,
      data: { categories: [] },
    });
  }

  // Use text search index
  const categories = await Category.find({
    $text: { $search: query },
    isActive: true,
  })
    .select('name slug path level icon color childrenCount')
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();

  res.json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

/**
 * @desc    Get category hierarchy (with subcategories)
 * @route   GET /api/categories/hierarchy
 * @access  Public
 */
exports.getCategoryHierarchy = asyncHandler(async (req, res) => {
  const cacheKey = 'categories:hierarchy';
  
  let categories = CacheUtil.get(cacheKey);
  
  if (!categories) {
    // Get all top-level categories
    const topLevel = await Category.find({ 
      isActive: true, 
      level: 0,
      parent: null 
    })
      .populate('postsCount')
      .sort({ order: 1, name: 1 })
      .lean();
    
    // Get subcategories for each top-level category
    for (const category of topLevel) {
      const subcategories = await Category.find({
        isActive: true,
        parent: category._id,
      })
        .populate('postsCount')
        .sort({ order: 1, name: 1 })
        .limit(10) // Limit subcategories for performance
        .lean();
      
      category.subcategories = subcategories;
    }
    
    categories = topLevel;
    
    // Cache for 10 minutes
    CacheUtil.set(cacheKey, categories, 600);
  }

  res.json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

/**
 * @desc    Get single category
 * @route   GET /api/categories/:slug
 * @access  Public
 */
exports.getCategory = asyncHandler(async (req, res) => {
  const cacheKey = `category:${req.params.slug}`;
  
  // Try to get from cache
  let category = CacheUtil.get(cacheKey);
  
  if (!category) {
    category = await Category.findOne({ slug: req.params.slug }).populate('postsCount');

    if (!category || !category.isActive) {
      throw new ErrorResponse('Category not found', 404);
    }

    // Cache for 10 minutes
    CacheUtil.set(cacheKey, category, 600);
  } else if (!category.isActive) {
    throw new ErrorResponse('Category not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      category,
    },
  });
});

/**
 * @desc    Create category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description, order, isActive } = req.body;
  
  // Get image from uploaded file or URL
  let image = req.body.image;
  
  // If file is uploaded, upload to Cloudinary first
  if (req.file) {
    try {
      const uploadedResult = await uploadImage(req.file.path);
      image = uploadedResult.secure_url; // Use Cloudinary URL
    } catch (error) {
      throw new ErrorResponse('Failed to upload image: ' + error.message, 500);
    }
  }

  // Check if category already exists
  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    throw new ErrorResponse('Category already exists', 400);
  }

  const category = await Category.create({
    name,
    description,
    image,
    order: order || 0,
    isActive: isActive !== undefined ? isActive : true,
  });

  // Clear cache
  CacheUtil.del('categories:all');

  res.status(201).json({
    status: 'success',
    message: 'Category created successfully',
    data: {
      category,
    },
  });
});

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
exports.updateCategory = asyncHandler(async (req, res) => {
  const { name, description, order, isActive } = req.body;

  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ErrorResponse('Category not found', 404);
  }

  // Check if name is being changed and already exists
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      throw new ErrorResponse('Category name already exists', 400);
    }
  }

  if (name) category.name = name;
  if (description !== undefined) category.description = description;
  if (order !== undefined) category.order = order;
  if (isActive !== undefined) category.isActive = isActive;

  // Update image if provided
  if (req.file) {
    // Delete old image from Cloudinary if exists
    if (category.image && category.image.includes('cloudinary.com')) {
      try {
        await deleteImage(category.image);
      } catch (error) {
        console.warn('Failed to delete old image from Cloudinary:', error.message);
      }
    }

    // Upload new image to Cloudinary
    try {
      const uploadedResult = await uploadImage(req.file.path);
      category.image = uploadedResult.secure_url; // Use Cloudinary URL
    } catch (error) {
      throw new ErrorResponse('Failed to upload image: ' + error.message, 500);
    }
  } else if (req.body.image !== undefined) {
    // If setting to empty or different URL, delete old image from Cloudinary
    if (category.image && 
        category.image !== req.body.image && 
        category.image.includes('cloudinary.com')) {
      try {
        await deleteImage(category.image);
      } catch (error) {
        console.warn('Failed to delete old image from Cloudinary:', error.message);
      }
    }
    category.image = req.body.image;
  }

  await category.save();

  // Clear cache
  CacheUtil.del('categories:all');
  CacheUtil.del(`category:${category.slug}`);

  res.json({
    status: 'success',
    message: 'Category updated successfully',
    data: {
      category,
    },
  });
});

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ErrorResponse('Category not found', 404);
  }

  // Check if category has posts
  const postsCount = await Post.countDocuments({ category: category._id });
  if (postsCount > 0) {
    throw new ErrorResponse('Cannot delete category with existing posts', 400);
  }

  // Delete image from Cloudinary if exists
  if (category.image && category.image.includes('cloudinary.com')) {
    try {
      await deleteImage(category.image);
    } catch (error) {
      console.warn('Failed to delete image from Cloudinary:', error.message);
    }
  }

  await category.remove();

  // Clear cache
  CacheUtil.del('categories:all');
  CacheUtil.del(`category:${category.slug}`);

  res.json({
    status: 'success',
    message: 'Category deleted successfully',
  });
});

/**
 * @desc    Get category posts
 * @route   GET /api/categories/:id/posts
 * @access  Public
 */
exports.getCategoryPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const posts = await Post.findPublished({ category: req.params.id })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ publishedAt: -1 });

  const total = await Post.countDocuments({
    category: req.params.id,
    status: 'published',
    publishedAt: { $lte: new Date() },
  });

  res.json({
    status: 'success',
    results: posts.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      posts,
    },
  });
});

