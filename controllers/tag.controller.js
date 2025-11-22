const Tag = require('../models/Tag.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const CacheUtil = require('../utils/cache.util');

/**
 * @desc    Get all tags
 * @route   GET /api/tags
 * @access  Public
 */
exports.getTags = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const tags = await Tag.find()
    .skip(skip)
    .limit(limit)
    .sort({ usageCount: -1, name: 1 });

  const total = await Tag.countDocuments();

  res.json({
    status: 'success',
    results: tags.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      tags,
    },
  });
});

/**
 * @desc    Get popular tags
 * @route   GET /api/tags/popular
 * @access  Public
 */
exports.getPopularTags = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const cacheKey = `tags:popular:${limit}`;

  // Try to get from cache
  let tags = CacheUtil.get(cacheKey);

  if (!tags) {
    tags = await Tag.find()
      .sort({ usageCount: -1 })
      .limit(limit)
      .select('name slug usageCount')
      .lean(); // Use lean() for better performance

    // Cache for 15 minutes
    CacheUtil.set(cacheKey, tags, 900);
  }

  res.json({
    status: 'success',
    results: tags.length,
    data: {
      tags,
    },
  });
});

/**
 * @desc    Search tags
 * @route   GET /api/tags/search?q=&limit=20
 * @access  Public
 */
exports.searchTags = asyncHandler(async (req, res) => {
  const query = req.query.q || '';
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  
  if (!query || query.length < 2) {
    return res.json({
      status: 'success',
      results: 0,
      data: { tags: [] },
    });
  }

  // Use text search index
  const tags = await Tag.find({
    $text: { $search: query },
  })
    .select('name slug usageCount')
    .sort({ score: { $meta: 'textScore' }, usageCount: -1 })
    .limit(limit)
    .lean();

  res.json({
    status: 'success',
    results: tags.length,
    data: {
      tags,
    },
  });
});

/**
 * @desc    Autocomplete tags (prefix matching)
 * @route   GET /api/tags/autocomplete?q=&limit=10
 * @access  Public
 */
exports.autocompleteTags = asyncHandler(async (req, res) => {
  const query = req.query.q || '';
  const limit = Math.min(parseInt(req.query.limit) || 10, 20);
  
  if (!query || query.length < 1) {
    return res.json({
      status: 'success',
      results: 0,
      data: { tags: [] },
    });
  }

  // Prefix matching for autocomplete (faster than text search)
  const tags = await Tag.find({
    name: { $regex: `^${query}`, $options: 'i' },
  })
    .select('name slug usageCount')
    .sort({ usageCount: -1, name: 1 })
    .limit(limit)
    .lean();

  res.json({
    status: 'success',
    results: tags.length,
    data: {
      tags,
    },
  });
});

/**
 * @desc    Get top tags by usage count
 * @route   GET /api/tags/top?limit=50
 * @access  Public
 */
exports.getTopTags = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const minUsage = parseInt(req.query.minUsage) || 1;
  
  const cacheKey = `tags:top:${limit}:${minUsage}`;
  let tags = CacheUtil.get(cacheKey);

  if (!tags) {
    tags = await Tag.find({
      usageCount: { $gte: minUsage },
    })
      .select('name slug usageCount description')
      .sort({ usageCount: -1 })
      .limit(limit)
      .lean();

    CacheUtil.set(cacheKey, tags, 600); // 10 min cache
  }

  res.json({
    status: 'success',
    results: tags.length,
    data: {
      tags,
    },
  });
});

/**
 * @desc    Get single tag
 * @route   GET /api/tags/:slug
 * @access  Public
 */
exports.getTag = asyncHandler(async (req, res) => {
  const tag = await Tag.findOne({ slug: req.params.slug });

  if (!tag) {
    throw new ErrorResponse('Tag not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      tag,
    },
  });
});

/**
 * @desc    Create tag
 * @route   POST /api/tags
 * @access  Private/Admin
 */
exports.createTag = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // Check if tag already exists
  const existingTag = await Tag.findOne({ name: name.toLowerCase() });
  if (existingTag) {
    throw new ErrorResponse('Tag already exists', 400);
  }

  const tag = await Tag.create({
    name: name.toLowerCase(),
    description,
  });

  res.status(201).json({
    status: 'success',
    message: 'Tag created successfully',
    data: {
      tag,
    },
  });
});

/**
 * @desc    Update tag
 * @route   PUT /api/tags/:id
 * @access  Private/Admin
 */
exports.updateTag = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const tag = await Tag.findById(req.params.id);
  if (!tag) {
    throw new ErrorResponse('Tag not found', 404);
  }

  // Check if name is being changed and already exists
  if (name && name.toLowerCase() !== tag.name) {
    const existingTag = await Tag.findOne({ name: name.toLowerCase() });
    if (existingTag) {
      throw new ErrorResponse('Tag name already exists', 400);
    }
  }

  if (name) tag.name = name.toLowerCase();
  if (description !== undefined) tag.description = description;

  await tag.save();

  // Clear cache
  CacheUtil.del('tags:popular:*');
  CacheUtil.del(`tag:${tag.slug}`);

  res.json({
    status: 'success',
    message: 'Tag updated successfully',
    data: {
      tag,
    },
  });
});

/**
 * @desc    Delete tag
 * @route   DELETE /api/tags/:id
 * @access  Private/Admin
 */
exports.deleteTag = asyncHandler(async (req, res) => {
  const tag = await Tag.findById(req.params.id);
  if (!tag) {
    throw new ErrorResponse('Tag not found', 404);
  }

  await tag.remove();

  res.json({
    status: 'success',
    message: 'Tag deleted successfully',
  });
});

/**
 * @desc    Get tag posts
 * @route   GET /api/tags/:id/posts
 * @access  Public
 */
exports.getTagPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const posts = await Post.findPublished({ tags: req.params.id })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ publishedAt: -1 });

  const total = await Post.countDocuments({
    tags: req.params.id,
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

