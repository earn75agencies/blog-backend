const Product = require('../models/Product.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const CacheUtil = require('../utils/cache.util');

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Public
 */
exports.getProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  const query = { status: 'active' };

  if (req.query.category) {
    query.category = req.query.category;
  }
  if (req.query.tag) {
    query.tags = req.query.tag;
  }
  if (req.query.type) {
    query.type = req.query.type;
  }
  if (req.query.vendor) {
    query.vendor = req.query.vendor;
  }
  if (req.query.priceMin) {
    query.price = { ...query.price, $gte: parseFloat(req.query.priceMin) };
  }
  if (req.query.priceMax) {
    query.price = { ...query.price, $lte: parseFloat(req.query.priceMax) };
  }
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } },
      { sku: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

  const products = await Product.find(query)
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .populate('vendor', 'username avatar firstName lastName')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });

  const total = await Product.countDocuments(query);

  res.json({
    status: 'success',
    results: products.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      products,
    },
  });
});

/**
 * @desc    Get single product
 * @route   GET /api/products/:slug
 * @access  Public
 */
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate('category', 'name slug description')
    .populate('tags', 'name slug')
    .populate('vendor', 'username avatar firstName lastName bio');

  if (!product) {
    throw new ErrorResponse('Product not found', 404);
  }

  if (product.status !== 'active' && (!req.user || (req.user.role !== 'admin' && req.user._id.toString() !== product.vendor._id.toString()))) {
    throw new ErrorResponse('Product not found', 404);
  }

  await product.incrementViews();

  res.json({
    status: 'success',
    data: {
      product,
    },
  });
});

/**
 * @desc    Create product
 * @route   POST /api/products
 * @access  Private/Vendor
 */
exports.createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    category,
    tags,
    price,
    currency,
    compareAtPrice,
    cost,
    type,
    images,
    featuredImage,
    status,
    inventory,
    shipping,
    seoTitle,
    seoDescription,
    seoKeywords,
  } = req.body;

  const product = await Product.create({
    name,
    description,
    vendor: req.user._id,
    category,
    tags: tags || [],
    price: price || 0,
    currency: currency || 'USD',
    compareAtPrice,
    cost,
    type: type || 'physical',
    images: images || [],
    featuredImage,
    status: status || 'draft',
    inventory: inventory || { trackInventory: false, quantity: 0, lowStockThreshold: 10 },
    shipping: shipping || { requiresShipping: type === 'physical' },
    seoTitle,
    seoDescription,
    seoKeywords: seoKeywords ? (Array.isArray(seoKeywords) ? seoKeywords : seoKeywords.split(',')) : [],
  });

  const populatedProduct = await Product.findById(product._id)
    .populate('vendor', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug');

  res.status(201).json({
    status: 'success',
    message: 'Product created successfully',
    data: {
      product: populatedProduct,
    },
  });
});

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Vendor
 */
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ErrorResponse('Product not found', 404);
  }

  if (product.vendor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this product', 403);
  }

  const updateFields = [
    'name', 'description', 'category', 'tags', 'price', 'currency',
    'compareAtPrice', 'cost', 'type', 'images', 'featuredImage',
    'status', 'inventory', 'shipping', 'seoTitle', 'seoDescription', 'seoKeywords',
  ];

  updateFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === 'tags' || field === 'images' || field === 'seoKeywords') {
        product[field] = Array.isArray(req.body[field])
          ? req.body[field]
          : req.body[field].split(',');
      } else {
        product[field] = req.body[field];
      }
    }
  });

  await product.save();

  const updatedProduct = await Product.findById(product._id)
    .populate('vendor', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug');

  res.json({
    status: 'success',
    message: 'Product updated successfully',
    data: {
      product: updatedProduct,
    },
  });
});

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Vendor
 */
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ErrorResponse('Product not found', 404);
  }

  if (product.vendor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to delete this product', 403);
  }

  product.status = 'archived';
  await product.save();

  res.json({
    status: 'success',
    message: 'Product deleted successfully',
  });
});

/**
 * @desc    Add product rating
 * @route   POST /api/products/:id/rate
 * @access  Private
 */
exports.rateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ErrorResponse('Product not found', 404);
  }

  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ErrorResponse('Rating must be between 1 and 5', 400);
  }

  await product.addRating(req.user._id, rating, review);

  const updatedProduct = await Product.findById(product._id);

  res.json({
    status: 'success',
    message: 'Rating added successfully',
    data: {
      product: updatedProduct,
    },
  });
});

/**
 * @desc    Get featured products
 * @route   GET /api/products/featured
 * @access  Public
 */
exports.getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 8;

  const cacheKey = `products:featured:${limit}`;
  let products = CacheUtil.get(cacheKey);

  if (!products) {
    products = await Product.find({
      status: 'active',
    })
      .populate('vendor', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .limit(limit)
      .sort({ salesCount: -1, averageRating: -1 });

    CacheUtil.set(cacheKey, products, 600); // Cache for 10 minutes
  }

  res.json({
    status: 'success',
    results: products.length,
    data: {
      products,
    },
  });
});

