const Product = require('../models/Product.model');
const Order = require('../models/Order.model');
const Cart = require('../models/Wishlist.model'); // Reusing Wishlist as Cart
const Coupon = require('../models/Coupon.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get products with advanced filtering
 * @route   GET /api/products
 * @access  Public
 */
exports.getProducts = asyncHandler(async (req, res) => {
  const {
    category,
    subcategory,
    type,
    minPrice,
    maxPrice,
    inStock,
    region,
    search,
    sort = 'createdAt',
    order = 'desc',
    limit = 20,
    page = 1,
  } = req.query;

  const query = { status: 'active' };
  
  if (category) query.category = category;
  if (subcategory) query.subcategories = subcategory;
  if (type) query.type = type;
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }
  if (inStock === 'true') {
    query.$or = [
      { 'inventory.trackInventory': false },
      { 'inventory.quantity': { $gt: 0 } },
    ];
  }
  if (region) {
    query.$or = [
      { visibleRegions: { $in: [region] } },
      { visibleRegions: { $size: 0 } },
    ];
    query.hiddenRegions = { $ne: region };
  }
  if (search) {
    query.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = {};
  sortObj[sort] = order === 'desc' ? -1 : 1;

  const products = await Product.find(query)
    .populate('category', 'name slug')
    .populate('vendor', 'username avatar')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Product.countDocuments(query);

  res.json({
    status: 'success',
    data: {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @desc    Get product recommendations
 * @route   GET /api/products/:id/recommendations
 * @access  Public
 */
exports.getProductRecommendations = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    throw new ErrorResponse('Product not found', 404);
  }

  // Get recommended products
  let recommendations = [];
  if (product.recommendedProducts && product.recommendedProducts.length > 0) {
    recommendations = await Product.find({
      _id: { $in: product.recommendedProducts },
      status: 'active',
    })
      .populate('vendor', 'username avatar')
      .limit(10);
  } else {
    // Fallback: get similar products by category
    recommendations = await Product.find({
      category: product.category,
      _id: { $ne: id },
      status: 'active',
    })
      .sort({ salesCount: -1 })
      .limit(10)
      .populate('vendor', 'username avatar');
  }

  res.json({
    status: 'success',
    data: { recommendations },
  });
});

/**
 * @desc    Apply coupon to product
 * @route   POST /api/products/:id/apply-coupon
 * @access  Private
 */
exports.applyCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { couponCode } = req.body;

  const product = await Product.findById(id);
  if (!product) {
    throw new ErrorResponse('Product not found', 404);
  }

  const coupon = await Coupon.findOne({
    code: couponCode,
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  });

  if (!coupon) {
    throw new ErrorResponse('Invalid or expired coupon', 400);
  }

  // Check if coupon applies to this product
  if (coupon.products && !coupon.products.includes(id)) {
    throw new ErrorResponse('Coupon does not apply to this product', 400);
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (product.price * coupon.value) / 100;
  } else {
    discount = coupon.value;
  }

  const finalPrice = Math.max(0, product.price - discount);

  res.json({
    status: 'success',
    data: {
      originalPrice: product.price,
      discount,
      finalPrice,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
    },
  });
});

/**
 * @desc    Get product analytics
 * @route   GET /api/products/:id/analytics
 * @access  Private
 */
exports.getProductAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    throw new ErrorResponse('Product not found', 404);
  }

  // Check permissions
  if (product.vendor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  // Get order analytics
  const orders = await Order.find({ 'items.product': id });
  const totalRevenue = orders.reduce((sum, order) => {
    const item = order.items.find(i => i.product.toString() === id.toString());
    return sum + (item ? item.price * item.quantity : 0);
  }, 0);

  const analytics = {
    ...product.analytics,
    totalSales: product.salesCount,
    totalRevenue,
    totalOrders: orders.length,
    averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    views: product.views,
    addToCartRate: product.analytics.addToCartCount / product.views || 0,
    conversionRate: product.analytics.conversionRate,
  };

  res.json({
    status: 'success',
    data: { analytics },
  });
});

