const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const Post = require('../models/Post.model');
const User = require('../models/User.model');
const Category = require('../models/Category.model');
const Tag = require('../models/Tag.model');

/**
 * @desc    Public API - Get posts
 * @route   GET /api/public/posts
 * @access  Public
 */
exports.getPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = { status: 'published', isPublished: true };

  if (req.query.category) {
    query.category = req.query.category;
  }
  if (req.query.tag) {
    query.tags = req.query.tag;
  }
  if (req.query.author) {
    query.author = req.query.author;
  }
  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { excerpt: { $regex: req.query.search, $options: 'i' } },
      { content: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const posts = await Post.find(query)
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .select('title excerpt featuredImage slug publishedAt views likesCount commentsCount')
    .skip(skip)
    .limit(limit)
    .sort({ publishedAt: -1 });

  const total = await Post.countDocuments(query);

  res.json({
    status: 'success',
    version: 'v1',
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

/**
 * @desc    Public API - Get single post
 * @route   GET /api/public/posts/:slug
 * @access  Public
 */
exports.getPost = asyncHandler(async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug })
    .populate('author', 'username avatar firstName lastName bio')
    .populate('category', 'name slug description')
    .populate('tags', 'name slug');

  if (!post || post.status !== 'published') {
    throw new ErrorResponse('Post not found', 404);
  }

  res.json({
    status: 'success',
    version: 'v1',
    data: {
      post,
    },
  });
});

/**
 * @desc    Public API - Get users
 * @route   GET /api/public/users
 * @access  Public
 */
exports.getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = { isActive: true };

  if (req.query.role) {
    query.role = req.query.role;
  }
  if (req.query.search) {
    query.$or = [
      { username: { $regex: req.query.search, $options: 'i' } },
      { firstName: { $regex: req.query.search, $options: 'i' } },
      { lastName: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .select('username avatar firstName lastName bio role followersCount postsCount')
    .skip(skip)
    .limit(limit)
    .sort({ followersCount: -1 });

  const total = await User.countDocuments(query);

  res.json({
    status: 'success',
    version: 'v1',
    results: users.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      users,
    },
  });
});

/**
 * @desc    Public API - Get categories
 * @route   GET /api/public/categories
 * @access  Public
 */
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .select('name slug description postsCount')
    .sort({ postsCount: -1 });

  res.json({
    status: 'success',
    version: 'v1',
    results: categories.length,
    data: {
      categories,
    },
  });
});

/**
 * @desc    Public API - Get tags
 * @route   GET /api/public/tags
 * @access  Public
 */
exports.getTags = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  
  const tags = await Tag.find({})
    .select('name slug postsCount')
    .sort({ postsCount: -1 })
    .limit(limit);

  res.json({
    status: 'success',
    version: 'v1',
    results: tags.length,
    data: {
      tags,
    },
  });
});

/**
 * @desc    Public API - API documentation
 * @route   GET /api/public/docs
 * @access  Public
 */
exports.getApiDocs = asyncHandler(async (req, res) => {
  res.json({
    status: 'success',
    version: 'v1',
    documentation: {
      title: 'Gidi Global Blog Public API',
      version: '1.0.0',
      baseUrl: `${req.protocol}://${req.get('host')}/api/public`,
      endpoints: {
        posts: {
          list: 'GET /posts',
          single: 'GET /posts/:slug',
        },
        users: {
          list: 'GET /users',
        },
        categories: {
          list: 'GET /categories',
        },
        tags: {
          list: 'GET /tags',
        },
      },
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization: Bearer <token>',
      },
      rateLimiting: {
        free: '100 requests/hour',
        premium: '1000 requests/hour',
      },
    },
  });
});

