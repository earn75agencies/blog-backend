const Series = require('../models/Series.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const CacheUtil = require('../utils/cache.util');

/**
 * @desc    Get all series
 * @route   GET /api/series
 * @access  Public
 */
exports.getSeries = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { status: 'published', isPublished: true };

  if (req.query.author) {
    query.author = req.query.author;
  }
  if (req.query.category) {
    query.category = req.query.category;
  }
  if (req.query.tag) {
    query.tags = req.query.tag;
  }
  if (req.query.featured) {
    query.isFeatured = req.query.featured === 'true';
  }

  const series = await Series.find(query)
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .populate('posts.post', 'title slug featuredImage')
    .skip(skip)
    .limit(limit)
    .sort({ publishedAt: -1 });

  const total = await Series.countDocuments(query);

  res.json({
    status: 'success',
    results: series.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      series,
    },
  });
});

/**
 * @desc    Get single series
 * @route   GET /api/series/:slug
 * @access  Public
 */
exports.getSingleSeries = asyncHandler(async (req, res) => {
  const series = await Series.findOne({ slug: req.params.slug })
    .populate('author', 'username avatar firstName lastName bio')
    .populate('category', 'name slug description')
    .populate('tags', 'name slug')
    .populate({
      path: 'posts.post',
      select: 'title slug excerpt featuredImage publishedAt views likesCount',
    });

  if (!series) {
    throw new ErrorResponse('Series not found', 404);
  }

  if (series.status !== 'published' && (!req.user || (req.user._id.toString() !== series.author._id.toString() && req.user.role !== 'admin'))) {
    throw new ErrorResponse('Series not found', 404);
  }

  await series.incrementViews();

  res.json({
    status: 'success',
    data: {
      series,
    },
  });
});

/**
 * @desc    Create series
 * @route   POST /api/series
 * @access  Private/Author
 */
exports.createSeries = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    tags,
    status,
    isFeatured,
    featuredImage,
    seoTitle,
    seoDescription,
    seoKeywords,
    price,
    currency,
    isPaid,
  } = req.body;

  const series = await Series.create({
    title,
    description,
    author: req.user._id,
    category,
    tags: tags || [],
    status: status || 'draft',
    isFeatured: isFeatured || false,
    featuredImage,
    seoTitle,
    seoDescription,
    seoKeywords: seoKeywords ? (Array.isArray(seoKeywords) ? seoKeywords : seoKeywords.split(',')) : [],
    price: price || 0,
    currency: currency || 'USD',
    isPaid: isPaid || false,
  });

  const populatedSeries = await Series.findById(series._id)
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug');

  res.status(201).json({
    status: 'success',
    message: 'Series created successfully',
    data: {
      series: populatedSeries,
    },
  });
});

/**
 * @desc    Update series
 * @route   PUT /api/series/:id
 * @access  Private/Author
 */
exports.updateSeries = asyncHandler(async (req, res) => {
  const series = await Series.findById(req.params.id);
  if (!series) {
    throw new ErrorResponse('Series not found', 404);
  }

  if (series.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this series', 403);
  }

  const {
    title,
    description,
    category,
    tags,
    status,
    isFeatured,
    featuredImage,
    seoTitle,
    seoDescription,
    seoKeywords,
    price,
    currency,
    isPaid,
  } = req.body;

  if (title) series.title = title;
  if (description) series.description = description;
  if (category) series.category = category;
  if (tags) series.tags = tags;
  if (status) series.status = status;
  if (isFeatured !== undefined) series.isFeatured = isFeatured;
  if (featuredImage !== undefined) series.featuredImage = featuredImage;
  if (seoTitle) series.seoTitle = seoTitle;
  if (seoDescription) series.seoDescription = seoDescription;
  if (seoKeywords) series.seoKeywords = Array.isArray(seoKeywords) ? seoKeywords : seoKeywords.split(',');
  if (price !== undefined) series.price = price;
  if (currency) series.currency = currency;
  if (isPaid !== undefined) series.isPaid = isPaid;

  await series.save();

  const updatedSeries = await Series.findById(series._id)
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug');

  res.json({
    status: 'success',
    message: 'Series updated successfully',
    data: {
      series: updatedSeries,
    },
  });
});

/**
 * @desc    Delete series
 * @route   DELETE /api/series/:id
 * @access  Private/Author
 */
exports.deleteSeries = asyncHandler(async (req, res) => {
  const series = await Series.findById(req.params.id);
  if (!series) {
    throw new ErrorResponse('Series not found', 404);
  }

  if (series.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to delete this series', 403);
  }

  await series.remove();

  res.json({
    status: 'success',
    message: 'Series deleted successfully',
  });
});

/**
 * @desc    Add post to series
 * @route   POST /api/series/:id/posts
 * @access  Private/Author
 */
exports.addPostToSeries = asyncHandler(async (req, res) => {
  const series = await Series.findById(req.params.id);
  if (!series) {
    throw new ErrorResponse('Series not found', 404);
  }

  if (series.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to modify this series', 403);
  }

  const { postId, order } = req.body;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  await series.addPost(postId, order);

  const updatedSeries = await Series.findById(series._id)
    .populate('posts.post', 'title slug featuredImage');

  res.json({
    status: 'success',
    message: 'Post added to series successfully',
    data: {
      series: updatedSeries,
    },
  });
});

/**
 * @desc    Remove post from series
 * @route   DELETE /api/series/:id/posts/:postId
 * @access  Private/Author
 */
exports.removePostFromSeries = asyncHandler(async (req, res) => {
  const series = await Series.findById(req.params.id);
  if (!series) {
    throw new ErrorResponse('Series not found', 404);
  }

  if (series.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to modify this series', 403);
  }

  await series.removePost(req.params.postId);

  res.json({
    status: 'success',
    message: 'Post removed from series successfully',
    data: {
      series,
    },
  });
});

/**
 * @desc    Subscribe to series
 * @route   POST /api/series/:id/subscribe
 * @access  Private
 */
exports.subscribeToSeries = asyncHandler(async (req, res) => {
  const series = await Series.findById(req.params.id);
  if (!series) {
    throw new ErrorResponse('Series not found', 404);
  }

  await series.subscribe(req.user._id);

  res.json({
    status: 'success',
    message: 'Subscribed to series successfully',
    data: {
      series,
    },
  });
});

/**
 * @desc    Unsubscribe from series
 * @route   POST /api/series/:id/unsubscribe
 * @access  Private
 */
exports.unsubscribeFromSeries = asyncHandler(async (req, res) => {
  const series = await Series.findById(req.params.id);
  if (!series) {
    throw new ErrorResponse('Series not found', 404);
  }

  await series.unsubscribe(req.user._id);

  res.json({
    status: 'success',
    message: 'Unsubscribed from series successfully',
    data: {
      series,
    },
  });
});

/**
 * @desc    Get featured series
 * @route   GET /api/series/featured
 * @access  Public
 */
exports.getFeaturedSeries = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  const cacheKey = `series:featured:${limit}`;
  let series = CacheUtil.get(cacheKey);

  if (!series) {
    series = await Series.find({
      status: 'published',
      isPublished: true,
      isFeatured: true,
    })
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .limit(limit)
      .sort({ publishedAt: -1 });

    CacheUtil.set(cacheKey, series, 600); // Cache for 10 minutes
  }

  res.json({
    status: 'success',
    results: series.length,
    data: {
      series,
    },
  });
});

