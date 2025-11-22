const Post = require('../models/Post.model');
const Category = require('../models/Category.model');
const Tag = require('../models/Tag.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const CacheUtil = require('../utils/cache.util');
const notificationService = require('../services/notification.service');
const { uploadImage, deleteImage } = require('../config/cloudinary.config');
const { randomString } = require('../utils/string.util');

/**
 * Generate a unique slug for a post
 * @param {string} baseSlug - The base slug generated from title
 * @returns {Promise<string>} Unique slug
 */
const generateUniqueSlug = async (baseSlug) => {
  let slug = baseSlug;
  let counter = 1;
  
  while (await Post.findOne({ slug })) {
    // Append random suffix to make it unique
    slug = `${baseSlug}-${randomString(5, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;
    counter++;
    // Prevent infinite loop - max 10 attempts
    if (counter > 10) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }
  
  return slug;
};

/**
 * @desc    Get all posts (supports both cursor and offset pagination)
 * @route   GET /api/posts?cursor=&limit=20
 * @access  Public
 */
exports.getPosts = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const cursor = req.query.cursor;
  const useCursor = cursor !== undefined || req.query.pagination === 'cursor';

  // Build base query
  let baseQuery = {
    status: 'published',
    publishedAt: { $lte: new Date() },
  };

  // Filter by category
  if (req.query.category) {
    baseQuery.category = req.query.category;
  }

  // Filter by tags
  if (req.query.tags) {
    const tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
    baseQuery.tags = { $in: tags };
  }

  // Filter by author
  if (req.query.author) {
    baseQuery.author = req.query.author;
  }

  if (useCursor) {
    // Cursor-based pagination (recommended for unlimited scalability)
    const posts = await Post.paginateWithCursor(baseQuery, { cursor, limit });
    
    const hasMore = posts.length > limit;
    const results = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore && results.length > 0 
      ? results[results.length - 1].cursor 
      : null;

    res.json({
      status: 'success',
      results: results.length,
      data: {
        posts: results,
      },
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } else {
    // Offset pagination (backward compatible)
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'publishedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const posts = await Post.find(baseQuery)
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder })
      .lean();

    const total = await Post.countDocuments(baseQuery);

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
  }
});

/**
 * @desc    Get single post
 * @route   GET /api/posts/:slug
 * @access  Public
 */
exports.getPost = asyncHandler(async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug })
    .populate('author', 'username avatar firstName lastName bio')
    .populate('category', 'name slug description')
    .populate('tags', 'name slug')
    .populate({
      path: 'comments',
      match: { isApproved: true, isSpam: false },
      populate: {
        path: 'author',
        select: 'username avatar firstName lastName',
      },
      options: { sort: { createdAt: -1 } },
    });

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Only show published posts to non-authors
  if (post.status !== 'published') {
    if (!req.user || (req.user._id.toString() !== post.author._id.toString() && req.user.role !== 'admin')) {
      throw new ErrorResponse('Post not found', 404);
    }
  }

  // Increment views (only for published posts)
  if (post.status === 'published') {
    await post.incrementViews();
  }

  res.json({
    status: 'success',
    data: {
      post,
    },
  });
});

/**
 * @desc    Create post
 * @route   POST /api/posts
 * @access  Private/Author
 */
exports.createPost = asyncHandler(async (req, res) => {
  const {
    title,
    excerpt,
    content,
    category,
    tags,
    status,
    seoTitle,
    seoDescription,
    seoKeywords,
    isFeatured,
    allowComments,
  } = req.body;

  // Verify category exists
  const categoryDoc = await Category.findById(category);
  if (!categoryDoc) {
    throw new ErrorResponse('Category not found', 404);
  }

  // Process tags
  let tagIds = [];
  if (tags && tags.length > 0) {
    for (const tagName of tags) {
      let tag = await Tag.findOne({ name: tagName.toLowerCase() });
      if (!tag) {
        tag = await Tag.create({ name: tagName.toLowerCase() });
      }
      tagIds.push(tag._id);
      await tag.incrementUsage();
    }
  }

  // Get featured image from uploaded file or URL
  let featuredImage = req.body.featuredImage;
  
  // If file is uploaded, upload to Cloudinary first
  if (req.file) {
    try {
      const uploadedResult = await uploadImage(req.file.path);
      featuredImage = uploadedResult.secure_url; // Use Cloudinary URL
    } catch (error) {
      throw new ErrorResponse('Failed to upload image: ' + error.message, 500);
    }
  }

  // Generate slug from title
  let baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Ensure slug is unique
  const slug = await generateUniqueSlug(baseSlug);

  const post = await Post.create({
    title,
    slug,
    excerpt,
    content,
    category,
    tags: tagIds,
    author: req.user._id,
    status: status || 'draft',
    featuredImage,
    seoTitle,
    seoDescription,
    seoKeywords: seoKeywords ? (Array.isArray(seoKeywords) ? seoKeywords : seoKeywords.split(',')) : [],
    isFeatured: isFeatured || false,
    allowComments: allowComments !== undefined ? allowComments : true,
  });

  const populatedPost = await Post.findById(post._id)
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug');

  // Clear cache - clear all featured and related post caches
  // Note: In production, use Redis with pattern matching for better cache invalidation

  res.status(201).json({
    status: 'success',
    message: 'Post created successfully',
    data: {
      post: populatedPost,
    },
  });
});

/**
 * @desc    Update post
 * @route   PUT /api/posts/:id
 * @access  Private/Author
 */
exports.updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check authorization
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this post', 403);
  }

  const {
    title,
    excerpt,
    content,
    category,
    tags,
    status,
    seoTitle,
    seoDescription,
    seoKeywords,
    isFeatured,
    allowComments,
  } = req.body;

  // Update category if provided
  if (category) {
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      throw new ErrorResponse('Category not found', 404);
    }
    post.category = category;
  }

  // Update tags if provided
  if (tags && tags.length > 0) {
    // Decrement usage for old tags
    for (const oldTagId of post.tags) {
      const oldTag = await Tag.findById(oldTagId);
      if (oldTag) {
        await oldTag.decrementUsage();
      }
    }

    // Process new tags
    let tagIds = [];
    for (const tagName of tags) {
      let tag = await Tag.findOne({ name: tagName.toLowerCase() });
      if (!tag) {
        tag = await Tag.create({ name: tagName.toLowerCase() });
      }
      tagIds.push(tag._id);
      await tag.incrementUsage();
    }
    post.tags = tagIds;
  }

  // Update other fields
  if (title) post.title = title;
  if (excerpt) post.excerpt = excerpt;
  if (content) post.content = content;
  if (status) post.status = status;
  if (seoTitle) post.seoTitle = seoTitle;
  if (seoDescription) post.seoDescription = seoDescription;
  if (seoKeywords !== undefined) {
    post.seoKeywords = Array.isArray(seoKeywords) ? seoKeywords : seoKeywords.split(',');
  }
  if (isFeatured !== undefined) post.isFeatured = isFeatured;
  if (allowComments !== undefined) post.allowComments = allowComments;

  // Update featured image if provided
  if (req.file) {
    // Delete old image from Cloudinary if exists
    if (post.featuredImage && post.featuredImage.includes('cloudinary.com')) {
      try {
        await deleteImage(post.featuredImage);
      } catch (error) {
        console.warn('Failed to delete old image from Cloudinary:', error.message);
      }
    }

    // Upload new image to Cloudinary
    try {
      const uploadedResult = await uploadImage(req.file.path);
      post.featuredImage = uploadedResult.secure_url; // Use Cloudinary URL
    } catch (error) {
      throw new ErrorResponse('Failed to upload image: ' + error.message, 500);
    }
  } else if (req.body.featuredImage !== undefined) {
    // If setting to empty or different URL, delete old image from Cloudinary
    if (post.featuredImage && 
        post.featuredImage !== req.body.featuredImage && 
        post.featuredImage.includes('cloudinary.com')) {
      try {
        await deleteImage(post.featuredImage);
      } catch (error) {
        console.warn('Failed to delete old image from Cloudinary:', error.message);
      }
    }
    post.featuredImage = req.body.featuredImage;
  }

  await post.save();

  const updatedPost = await Post.findById(post._id)
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug');

  // Clear related cache if post was featured
  if (post.isFeatured) {
    CacheUtil.del(`posts:featured:5`);
  }
  CacheUtil.del(`posts:related:${post._id}:*`);

  res.json({
    status: 'success',
    message: 'Post updated successfully',
    data: {
      post: updatedPost,
    },
  });
});

/**
 * @desc    Delete post
 * @route   DELETE /api/posts/:id
 * @access  Private/Author
 */
exports.deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check authorization
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to delete this post', 403);
  }

  // Decrement tag usage
  for (const tagId of post.tags) {
    const tag = await Tag.findById(tagId);
    if (tag) {
      await tag.decrementUsage();
    }
  }

  // Delete featured image from Cloudinary if exists
  if (post.featuredImage && post.featuredImage.includes('cloudinary.com')) {
    try {
      await deleteImage(post.featuredImage);
    } catch (error) {
      console.warn('Failed to delete image from Cloudinary:', error.message);
    }
  }

  await post.remove();

  // Clear cache
  CacheUtil.del(`posts:featured:*`);
  CacheUtil.del(`posts:related:${post._id}:*`);

  res.json({
    status: 'success',
    message: 'Post deleted successfully',
  });
});

/**
 * @desc    Like post
 * @route   POST /api/posts/:id/like
 * @access  Private
 */
exports.likePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const likesCount = await post.toggleLike(req.user._id);

  // Create notification if post was just liked (not unliked)
  const wasLiked = post.likes.includes(req.user._id);
  if (wasLiked && post.author.toString() !== req.user._id.toString()) {
    await notificationService.createPostLikeNotification(
      post._id.toString(),
      req.user._id.toString(),
      post.author.toString()
    );
  }

  res.json({
    status: 'success',
    message: 'Post liked successfully',
    data: {
      likes: likesCount,
    },
  });
});

/**
 * @desc    Unlike post
 * @route   POST /api/posts/:id/unlike
 * @access  Private
 */
exports.unlikePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const likesCount = await post.toggleLike(req.user._id);

  res.json({
    status: 'success',
    message: 'Post unliked successfully',
    data: {
      likes: likesCount,
    },
  });
});

/**
 * @desc    Get featured posts
 * @route   GET /api/posts/featured
 * @access  Public
 */
exports.getFeaturedPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const cacheKey = `posts:featured:${limit}`;

  // Try to get from cache
  let posts = CacheUtil.get(cacheKey);

  if (!posts) {
    posts = await Post.findPublished({ isFeatured: true })
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .limit(limit)
      .sort({ publishedAt: -1 })
      .lean(); // Use lean() for better performance

    // Cache for 10 minutes
    CacheUtil.set(cacheKey, posts, 600);
  }

  res.json({
    status: 'success',
    results: posts.length,
    data: {
      posts,
    },
  });
});

/**
 * @desc    Get posts by category
 * @route   GET /api/posts/category/:categoryId
 * @access  Public
 */
exports.getPostsByCategory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const posts = await Post.findPublished({ category: req.params.categoryId })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ publishedAt: -1 });

  const total = await Post.countDocuments({
    category: req.params.categoryId,
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

/**
 * @desc    Get posts by tag
 * @route   GET /api/posts/tag/:tagId
 * @access  Public
 */
exports.getPostsByTag = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const posts = await Post.findPublished({ tags: req.params.tagId })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ publishedAt: -1 });

  const total = await Post.countDocuments({
    tags: req.params.tagId,
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

/**
 * @desc    Get posts by author
 * @route   GET /api/posts/author/:authorId
 * @access  Public
 */
exports.getPostsByAuthor = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const posts = await Post.findPublished({ author: req.params.authorId })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ publishedAt: -1 });

  const total = await Post.countDocuments({
    author: req.params.authorId,
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

/**
 * @desc    Search posts
 * @route   GET /api/posts/search
 * @access  Public
 */
exports.searchPosts = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!q) {
    throw new ErrorResponse('Search query is required', 400);
  }

  const posts = await Post.searchPosts(q)
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .skip(skip)
    .limit(limit);

  const total = await Post.countDocuments({
    $text: { $search: q },
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

/**
 * @desc    Get related posts
 * @route   GET /api/posts/:id/related
 * @access  Public
 */
exports.getRelatedPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const cacheKey = `posts:related:${req.params.id}:${limit}`;

  // Try to get from cache
  let relatedPosts = CacheUtil.get(cacheKey);

  if (!relatedPosts) {
    const post = await Post.findById(req.params.id);
    if (!post) {
      throw new ErrorResponse('Post not found', 404);
    }

    // Find posts with same category or tags, excluding current post
    relatedPosts = await Post.findPublished({
      $or: [{ category: post.category }, { tags: { $in: post.tags } }],
      _id: { $ne: post._id },
    })
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .limit(limit)
      .sort({ publishedAt: -1 });

    // Cache for 15 minutes
    CacheUtil.set(cacheKey, relatedPosts, 900);
  }

  res.json({
    status: 'success',
    results: relatedPosts.length,
    data: {
      posts: relatedPosts,
    },
  });
});

/**
 * @desc    Get popular posts
 * @route   GET /api/posts/popular
 * @access  Public
 */
exports.getPopularPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const cacheKey = `posts:popular:${limit}`;

  // Try to get from cache
  let posts = CacheUtil.get(cacheKey);

  if (!posts) {
    posts = await Post.findPublished({})
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .limit(limit)
      .sort({ views: -1, likes: -1, publishedAt: -1 });

    // Cache for 10 minutes
    CacheUtil.set(cacheKey, posts, 600);
  }

  res.json({
    status: 'success',
    results: posts.length,
    data: {
      posts,
    },
  });
});

/**
 * @desc    Get trending posts
 * @route   GET /api/posts/trending
 * @access  Public
 */
exports.getTrendingPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const days = parseInt(req.query.days) || 7;
  const cacheKey = `posts:trending:${limit}:${days}`;

  // Try to get from cache
  let posts = CacheUtil.get(cacheKey);

  if (!posts) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    posts = await Post.findPublished({
      publishedAt: { $gte: dateThreshold },
    })
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .limit(limit)
      .sort({ views: -1, likes: -1, commentsCount: -1 });

    // Cache for 5 minutes (trending posts change frequently)
    CacheUtil.set(cacheKey, posts, 300);
  }

  res.json({
    status: 'success',
    results: posts.length,
    data: {
      posts,
    },
  });
});

/**
 * @desc    Get draft posts
 * @route   GET /api/posts/drafts/all
 * @access  Private/Admin
 */
exports.getDraftPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { status: 'draft' };

  // If not admin, only show own drafts
  if (req.user.role !== 'admin') {
    query.author = req.user._id;
  }

  const posts = await Post.find(query)
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Post.countDocuments(query);

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

/**
 * @desc    Get archived posts
 * @route   GET /api/posts/archived/all
 * @access  Private/Admin
 */
exports.getArchivedPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { status: 'archived' };

  // If not admin, only show own archived posts
  if (req.user.role !== 'admin') {
    query.author = req.user._id;
  }

  const posts = await Post.find(query)
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ updatedAt: -1 });

  const total = await Post.countDocuments(query);

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

/**
 * @desc    Publish post
 * @route   POST /api/posts/:id/publish
 * @access  Private/Author
 */
exports.publishPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check authorization
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to publish this post', 403);
  }

  post.status = 'published';
  if (!post.publishedAt) {
    post.publishedAt = new Date();
  }

  await post.save();

  // Clear cache
  CacheUtil.del('posts:featured:*');
  CacheUtil.del('posts:popular:*');
  CacheUtil.del('posts:trending:*');

  res.json({
    status: 'success',
    message: 'Post published successfully',
    data: {
      post,
    },
  });
});

/**
 * @desc    Unpublish post
 * @route   POST /api/posts/:id/unpublish
 * @access  Private/Author
 */
/**
 * @desc    Get embed code for post
 * @route   GET /api/posts/:id/embed
 * @access  Public
 */
exports.getEmbedCode = asyncHandler(async (req, res) => {
  const post = await Post.findOne({
    $or: [{ _id: req.params.id }, { slug: req.params.id }],
    status: 'published',
  })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .lean();

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const baseUrl = process.env.FRONTEND_URL || req.protocol + '://' + req.get('host');
  const embedUrl = `${baseUrl}/post/${post.slug}`;
  const width = req.query.width || '600';
  const height = req.query.height || '400';

  const embedCode = `<iframe src="${embedUrl}/embed" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`;
  const oEmbedUrl = `${baseUrl}/api/posts/${post._id}/oembed?url=${encodeURIComponent(embedUrl)}`;

  res.json({
    status: 'success',
    data: {
      embedCode,
      oEmbedUrl,
      embedUrl: `${embedUrl}/embed`,
      post: {
        title: post.title,
        excerpt: post.excerpt,
        author: post.author,
        category: post.category,
        featuredImage: post.featuredImage,
      },
    },
  });
});

/**
 * @desc    Get oEmbed data for post
 * @route   GET /api/posts/:id/oembed
 * @access  Public
 */
exports.getOEmbed = asyncHandler(async (req, res) => {
  const post = await Post.findOne({
    $or: [{ _id: req.params.id }, { slug: req.params.id }],
    status: 'published',
  })
    .populate('author', 'username avatar firstName lastName')
    .lean();

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const baseUrl = process.env.FRONTEND_URL || req.protocol + '://' + req.get('host');
  const url = req.query.url || `${baseUrl}/post/${post.slug}`;
  const maxWidth = req.query.maxwidth || 600;
  const maxHeight = req.query.maxheight || 400;

  const authorName = post.author
    ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || post.author.username
    : 'Unknown';

  res.json({
    type: 'rich',
    version: '1.0',
    title: post.title,
    author_name: authorName,
    author_url: `${baseUrl}/author/${post.author?.username || ''}`,
    provider_name: 'Gidix',
    provider_url: baseUrl,
    cache_age: 3600,
    html: `<iframe src="${url}/embed" width="${maxWidth}" height="${maxHeight}" frameborder="0" allowfullscreen></iframe>`,
    width: maxWidth,
    height: maxHeight,
    thumbnail_url: post.featuredImage || null,
    thumbnail_width: post.featuredImage ? 600 : null,
    thumbnail_height: post.featuredImage ? 400 : null,
  });
});

exports.unpublishPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check authorization
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to unpublish this post', 403);
  }

  post.status = 'draft';

  await post.save();

  // Clear cache
  CacheUtil.del('posts:featured:*');
  CacheUtil.del('posts:popular:*');
  CacheUtil.del('posts:trending:*');

  res.json({
    status: 'success',
    message: 'Post unpublished successfully',
    data: {
      post,
    },
  });
});

/**
 * @desc    Archive post
 * @route   POST /api/posts/:id/archive
 * @access  Private/Author
 */
exports.archivePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check authorization
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to archive this post', 403);
  }

  post.status = 'archived';

  await post.save();

  // Clear cache
  CacheUtil.del('posts:featured:*');
  CacheUtil.del('posts:popular:*');

  res.json({
    status: 'success',
    message: 'Post archived successfully',
    data: {
      post,
    },
  });
});

/**
 * @desc    Duplicate post
 * @route   POST /api/posts/:id/duplicate
 * @access  Private/Author
 */
exports.duplicatePost = asyncHandler(async (req, res) => {
  const originalPost = await Post.findById(req.params.id);
  if (!originalPost) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check authorization
  if (originalPost.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to duplicate this post', 403);
  }

  // Create duplicate post
  const duplicateTitle = `${originalPost.title} (Copy)`;
  let baseSlug = duplicateTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Ensure slug is unique
  const slug = await generateUniqueSlug(baseSlug);

  const duplicate = await Post.create({
    title: duplicateTitle,
    slug,
    excerpt: originalPost.excerpt,
    content: originalPost.content,
    category: originalPost.category,
    tags: originalPost.tags,
    author: req.user._id,
    status: 'draft',
    featuredImage: originalPost.featuredImage,
    seoTitle: originalPost.seoTitle,
    seoDescription: originalPost.seoDescription,
    seoKeywords: originalPost.seoKeywords,
    isFeatured: false,
    allowComments: originalPost.allowComments,
  });

  const populatedPost = await Post.findById(duplicate._id)
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug');

  res.status(201).json({
    status: 'success',
    message: 'Post duplicated successfully',
    data: {
      post: populatedPost,
    },
  });
});

/**
 * @desc    Export post
 * @route   GET /api/posts/:id/export
 * @access  Private/Author
 */
exports.exportPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate('author', 'username email')
    .populate('category', 'name slug')
    .populate('tags', 'name slug');

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check authorization
  if (post.author._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to export this post', 403);
  }

  // Export as JSON
  const exportData = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    category: post.category.name,
    tags: post.tags.map((tag) => tag.name),
    status: post.status,
    featuredImage: post.featuredImage,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    seoKeywords: post.seoKeywords,
    isFeatured: post.isFeatured,
    allowComments: post.allowComments,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    exportedAt: new Date().toISOString(),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${post.slug}-export.json"`);
  res.json(exportData);
});

/**
 * @desc    Import post
 * @route   POST /api/posts/import
 * @access  Private/Author
 */
exports.importPost = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ErrorResponse('Import file is required', 400);
  }

  // Parse JSON file
  const fs = require('fs');
  const importData = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));

  // Find or create category
  let category = await Category.findOne({ name: importData.category });
  if (!category) {
    category = await Category.create({
      name: importData.category,
      description: `Imported category: ${importData.category}`,
    });
  }

  // Process tags
  let tagIds = [];
  if (importData.tags && Array.isArray(importData.tags)) {
    for (const tagName of importData.tags) {
      let tag = await Tag.findOne({ name: tagName.toLowerCase() });
      if (!tag) {
        tag = await Tag.create({ name: tagName.toLowerCase() });
      }
      tagIds.push(tag._id);
    }
  }

  // Create post
  const importTitle = importData.title || 'Imported Post';
  let baseSlug = importTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Ensure slug is unique
  const importSlug = await generateUniqueSlug(baseSlug);

  const post = await Post.create({
    title: importTitle,
    slug: importSlug,
    excerpt: importData.excerpt || '',
    content: importData.content || '',
    category: category._id,
    tags: tagIds,
    author: req.user._id,
    status: importData.status || 'draft',
    featuredImage: importData.featuredImage,
    seoTitle: importData.seoTitle,
    seoDescription: importData.seoDescription,
    seoKeywords: importData.seoKeywords || [],
    isFeatured: importData.isFeatured || false,
    allowComments: importData.allowComments !== undefined ? importData.allowComments : true,
    publishedAt: importData.publishedAt ? new Date(importData.publishedAt) : null,
  });

  // Clean up uploaded file
  fs.unlinkSync(req.file.path);

  const populatedPost = await Post.findById(post._id)
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug');

  res.status(201).json({
    status: 'success',
    message: 'Post imported successfully',
    data: {
      post: populatedPost,
    },
  });
});

/**
 * @desc    Bulk delete posts
 * @route   POST /api/posts/bulk/delete
 * @access  Private/Admin
 */
exports.bulkDeletePosts = asyncHandler(async (req, res) => {
  const { postIds } = req.body;

  if (!Array.isArray(postIds) || postIds.length === 0) {
    throw new ErrorResponse('Post IDs array is required', 400);
  }

  // If not admin, only allow deleting own posts
  const query = { _id: { $in: postIds } };
  if (req.user.role !== 'admin') {
    query.author = req.user._id;
  }

  const posts = await Post.find(query);

  // Decrement tag usage for all posts
  for (const post of posts) {
    for (const tagId of post.tags) {
      const tag = await Tag.findById(tagId);
      if (tag) {
        await tag.decrementUsage();
      }
    }
  }

  const result = await Post.deleteMany(query);

  // Clear cache
  CacheUtil.del('posts:featured:*');
  CacheUtil.del('posts:popular:*');

  res.json({
    status: 'success',
    message: `${result.deletedCount} post(s) deleted successfully`,
    data: {
      deletedCount: result.deletedCount,
    },
  });
});

/**
 * @desc    Bulk update posts
 * @route   POST /api/posts/bulk/update
 * @access  Private/Admin
 */
exports.bulkUpdatePosts = asyncHandler(async (req, res) => {
  const { postIds, updates } = req.body;

  if (!Array.isArray(postIds) || postIds.length === 0) {
    throw new ErrorResponse('Post IDs array is required', 400);
  }

  if (!updates || typeof updates !== 'object') {
    throw new ErrorResponse('Updates object is required', 400);
  }

  // If not admin, only allow updating own posts
  const query = { _id: { $in: postIds } };
  if (req.user.role !== 'admin') {
    query.author = req.user._id;
  }

  // Remove fields that shouldn't be bulk updated
  const allowedFields = ['status', 'isFeatured', 'allowComments', 'category'];
  const filteredUpdates = {};
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  });

  if (Object.keys(filteredUpdates).length === 0) {
    throw new ErrorResponse('No valid update fields provided', 400);
  }

  const result = await Post.updateMany(query, { $set: filteredUpdates });

  // Clear cache
  CacheUtil.del('posts:featured:*');
  CacheUtil.del('posts:popular:*');

  res.json({
    status: 'success',
    message: `${result.modifiedCount} post(s) updated successfully`,
    data: {
      modifiedCount: result.modifiedCount,
    },
  });
});

