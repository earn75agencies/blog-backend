const Post = require('../models/Post');
const postValidator = require('../validators/postValidator');
const { asyncHandler, APIError } = require('../middleware/errorMiddleware');
const ErrorResponse = require('../utils/errorResponse');
const CacheUtil = require('../utils/cacheUtil');

/**
 * @desc    Get all posts with filtering and pagination (supports both cursor and offset)
 * @route   GET /api/posts
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

  // If user is admin, they can see all posts (including drafts)
  if (req.query.status === 'all' && req.isAdmin) {
    delete baseQuery.status;
    delete baseQuery.publishedAt;
  }

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

  // Filter by featured
  if (req.query.featured === 'true') {
    baseQuery.isFeatured = true;
  }

  // Search functionality
  if (req.query.search) {
    baseQuery.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { content: { $regex: req.query.search, $options: 'i' } },
      { excerpt: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  if (useCursor) {
    // Cursor-based pagination (recommended for unlimited scalability)
    const posts = await Post.paginateWithCursor(baseQuery, { cursor, limit });
    
    const hasMore = posts.length > limit;
    const results = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore && results.length > 0 
      ? results[results.length - 1].cursor 
      : null;

    // Add isLiked status for each post if user is authenticated
    let postsWithLikeStatus = results;
    if (req.user) {
      postsWithLikeStatus = results.map(post => ({
        ...post,
        isLiked: post.likedBy && post.likedBy.some(userId => userId.toString() === req.user._id.toString()),
      }));
    } else {
      postsWithLikeStatus = results.map(post => ({
        ...post,
        isLiked: false,
      }));
    }

    res.json({
      status: 'success',
      success: true,
      results: results.length,
      count: results.length,
      data: {
        posts: postsWithLikeStatus,
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
      .sort({ [sortBy]: sortOrder, createdAt: -1 })
      .lean();

    const total = await Post.countDocuments(baseQuery);

    // Add isLiked status for each post if user is authenticated
    let postsWithLikeStatus = posts;
    if (req.user) {
      postsWithLikeStatus = posts.map(post => ({
        ...post,
        isLiked: post.likedBy && post.likedBy.some(userId => userId.toString() === req.user._id.toString()),
      }));
    } else {
      postsWithLikeStatus = posts.map(post => ({
        ...post,
        isLiked: false,
      }));
    }

    res.json({
      status: 'success',
      success: true,
      results: posts.length,
      count: posts.length,
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      data: {
        posts: postsWithLikeStatus,
      },
      posts: postsWithLikeStatus,
    });
  }
});

// Alias for backward compatibility
exports.getAllPosts = exports.getPosts;

/**
 * @desc    Get single post
 * @route   GET /api/posts/:slug or GET /api/posts/:id
 * @access  Public
 */
exports.getPost = asyncHandler(async (req, res) => {
  const identifier = req.params.slug || req.params.id;
  let post;

  // Try to find by slug first, then by ID
  if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
    // It's a valid MongoDB ObjectId
    post = await Post.findById(identifier)
      .populate('author', 'username avatar firstName lastName bio')
      .populate('category', 'name slug description')
      .populate('tags', 'name slug')
      .populate({
        path: 'comments',
        match: { isApproved: true, isSpam: false },
        populate: {
          path: 'author user',
          select: 'username avatar firstName lastName',
        },
        options: { sort: { createdAt: -1 } },
      });
  } else {
    // Assume it's a slug
    post = await Post.findOne({ slug: identifier })
      .populate('author', 'username avatar firstName lastName bio')
      .populate('category', 'name slug description')
      .populate('tags', 'name slug')
      .populate({
        path: 'comments',
        match: { isApproved: true, isSpam: false },
        populate: {
          path: 'author user',
          select: 'username avatar firstName lastName',
        },
        options: { sort: { createdAt: -1 } },
      });
  }

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Only show published posts to non-authors
  if (post.status !== 'published') {
    if (!req.user || (req.user._id.toString() !== post.author._id.toString() && !req.isAdmin)) {
      throw new ErrorResponse('Post not found', 404);
    }
  }

  // Increment views (only for published posts)
  if (post.status === 'published') {
    if (post.incrementViews) {
      await post.incrementViews();
    } else {
      post.views = (post.views || 0) + 1;
      await post.save({ validateBeforeSave: false });
    }
  }

  // Check if current user has liked the post
  let isLiked = false;
  if (req.user) {
    const likedBy = post.likedBy || post.likes || [];
    isLiked = likedBy.some(userId => userId.toString() === req.user._id.toString());
  }

  // Convert post to object and add isLiked
  const postObj = post.toObject();
  
  // Convert sharesByPlatform Map to Object if it exists
  if (postObj.sharesByPlatform && postObj.sharesByPlatform instanceof Map) {
    const sharesByPlatform = {};
    postObj.sharesByPlatform.forEach((value, key) => {
      sharesByPlatform[key] = value;
    });
    postObj.sharesByPlatform = sharesByPlatform;
  }

  res.json({
    status: 'success',
    success: true,
    data: {
      post: {
        ...postObj,
        isLiked,
      },
    },
    post: {
      ...postObj,
      isLiked,
    },
  });
});

// Aliases for backward compatibility
exports.getPostById = exports.getPost;
exports.getPostBySlug = exports.getPost;

/**
 * @desc    Create new post
 * @route   POST /api/posts
 * @access  Private
 */
exports.createPost = asyncHandler(async (req, res) => {
  const isAdmin = req.isAdmin || false;
  
  const errors = postValidator.validateCreate(req.body, isAdmin);
  if (errors) {
    if (isAdmin) {
      console.warn('Admin post creation validation warnings (proceeding anyway):', errors);
      // Auto-fix ALL issues for admins
      req.body.title = req.body.title || 'Admin Post';
      req.body.content = req.body.content || req.body.description || 'Content created by admin';
      req.body.excerpt = req.body.excerpt || (req.body.content ? req.body.content.substring(0, 150) + '...' : 'Admin post');
      req.body.featuredImage = req.body.featuredImage || '/images/default-post.jpg';
      req.body.status = req.body.status || 'published';
      req.body.category = req.body.category || 'update';
    } else {
      return res.status(400).json({ success: false, errors });
    }
  }

  let post;
  if (isAdmin) {
    // Ensure all required fields exist
    req.body.title = req.body.title || 'Admin Post';
    req.body.content = req.body.content || 'Content created by admin';
    req.body.excerpt = req.body.excerpt || (req.body.content ? req.body.content.substring(0, 150) + '...' : 'Admin post');
    req.body.featuredImage = req.body.featuredImage || '/images/default-post.jpg';
    req.body.category = req.body.category || 'update';
    req.body.status = req.body.status || 'published';
    
    post = new Post({
      ...req.body,
      author: req.user._id,
      status: req.body.status || 'published'
    });
    await post.save({ validateBeforeSave: false });
  } else {
    post = await Post.create({
      ...req.body,
      author: req.user._id,
      status: req.body.status || 'draft'
    });
  }

  await post.populate('author', 'firstName lastName avatar username');

  res.status(201).json({
    success: true,
    status: 'success',
    message: 'Post created successfully',
    post,
    data: { post },
    ...(isAdmin && Object.keys(errors || {}).length > 0 && { 
      warnings: 'Some validations were bypassed for admin' 
    })
  });
});

/**
 * @desc    Update post
 * @route   PUT /api/posts/:id
 * @access  Private
 */
exports.updatePost = asyncHandler(async (req, res) => {
  const isAdmin = req.isAdmin || false;
  
  let post = await Post.findById(req.params.id);

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check authorization
  if (post.author.toString() !== req.user._id.toString() && !isAdmin) {
    throw new ErrorResponse('Not authorized to update this post', 403);
  }

  const errors = postValidator.validateUpdate(req.body, isAdmin);
  if (errors) {
    if (isAdmin) {
      console.warn('Admin post update validation warnings (proceeding anyway):', errors);
      // Auto-fix any issues
      if (req.body.title === undefined || !req.body.title) req.body.title = post.title || 'Admin Post';
      if (req.body.content === undefined || !req.body.content) req.body.content = post.content || 'Content created by admin';
      if (req.body.category && !['news', 'announcement', 'achievement', 'event-recap', 'blog', 'update'].includes(req.body.category)) {
        req.body.category = 'update';
      }
    } else {
      return res.status(400).json({ success: false, errors });
    }
  }

  // For admins, auto-fix any issues before updating
  if (isAdmin) {
    if (req.body.title === undefined || !req.body.title) req.body.title = post.title || 'Admin Post';
    if (req.body.content === undefined || !req.body.content) req.body.content = post.content || 'Content created by admin';
    if (req.body.excerpt === undefined || !req.body.excerpt) {
      req.body.excerpt = req.body.content ? req.body.content.substring(0, 150) + '...' : post.excerpt || 'Admin post';
    }
    if (req.body.featuredImage === undefined || !req.body.featuredImage) {
      req.body.featuredImage = post.featuredImage || '/images/default-post.jpg';
    }
    if (req.body.category && !['news', 'announcement', 'achievement', 'event-recap', 'blog', 'update'].includes(req.body.category)) {
      req.body.category = 'update';
    }
  }

  Object.keys(req.body).forEach((key) => {
    post[key] = req.body[key];
  });

  await post.save(isAdmin ? { validateBeforeSave: false } : {});
  await post.populate('author', 'firstName lastName avatar username');

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Post updated successfully',
    post,
    data: { post },
    ...(isAdmin && Object.keys(errors || {}).length > 0 && { 
      warnings: 'Some validations were bypassed for admin' 
    })
  });
});

/**
 * @desc    Delete post
 * @route   DELETE /api/posts/:id
 * @access  Private
 */
exports.deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  if (post.author.toString() !== req.user._id.toString() && !req.isAdmin) {
    throw new ErrorResponse('Not authorized to delete this post', 403);
  }

  await Post.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Post and all comments permanently deleted from database'
  });
});

/**
 * @desc    Like/Unlike post
 * @route   POST /api/posts/:id/like
 * @access  Private
 */
exports.toggleLike = asyncHandler(async (req, res) => {
  const isAdmin = req.isAdmin || false;
  let post = await Post.findById(req.params.id);

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const likesArray = post.likedBy || post.likes || [];
  const userLiked = likesArray.some(
    (like) => like.toString() === req.user._id.toString()
  );

  if (userLiked) {
    // Remove like
    if (post.likedBy) {
      post.likedBy = post.likedBy.filter(
        (like) => like.toString() !== req.user._id.toString()
      );
    }
    if (post.likes) {
      post.likes = post.likes.filter(
        (like) => like.toString() !== req.user._id.toString()
      );
    }
    if (post.likesCount !== undefined) {
      post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
    }
  } else {
    // Add like
    if (post.likedBy) {
      post.likedBy.push(req.user._id);
    }
    if (post.likes) {
      post.likes.push(req.user._id);
    }
    if (post.likesCount !== undefined) {
      post.likesCount = (post.likesCount || 0) + 1;
    }
  }

  await post.save(isAdmin ? { validateBeforeSave: false } : {});

  res.status(200).json({
    success: true,
    status: 'success',
    message: userLiked ? 'Like removed' : 'Post liked',
    likes: (post.likedBy || post.likes || []).length,
    likesCount: post.likesCount || (post.likedBy || post.likes || []).length,
    isLiked: !userLiked
  });
});

/**
 * @desc    Get users who liked a post
 * @route   GET /api/posts/:id/likes
 * @access  Public
 */
exports.getPostLikes = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate('likedBy likes', 'username avatar firstName lastName')
    .select('likedBy likes likesCount');

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const likedByArray = post.likedBy || post.likes || [];
  const likedBy = likedByArray.slice(skip, skip + limit);
  const total = likedByArray.length;

  res.json({
    status: 'success',
    success: true,
    results: likedBy.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      users: likedBy,
      likesCount: post.likesCount || total,
    },
  });
});

/**
 * @desc    Get current user's liked posts
 * @route   GET /api/posts/liked/me
 * @access  Private
 */
exports.getLikedPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const posts = await Post.find({
    $or: [
      { likedBy: req.user._id },
      { likes: req.user._id }
    ],
    status: 'published',
  })
    .populate('author', 'username avatar firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ updatedAt: -1 })
    .lean();

  const total = await Post.countDocuments({
    $or: [
      { likedBy: req.user._id },
      { likes: req.user._id }
    ],
    status: 'published',
  });

  const postsWithLikeStatus = posts.map(post => ({
    ...post,
    isLiked: true,
  }));

  res.json({
    status: 'success',
    success: true,
    results: posts.length,
    count: posts.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      posts: postsWithLikeStatus,
    },
    posts: postsWithLikeStatus,
  });
});

/**
 * @desc    Track post share
 * @route   POST /api/posts/:id/share
 * @access  Public
 */
exports.trackShare = asyncHandler(async (req, res) => {
  const { platform = 'general' } = req.body;
  const post = await Post.findById(req.params.id);

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const validPlatforms = [
    'general',
    'facebook',
    'twitter',
    'linkedin',
    'whatsapp',
    'telegram',
    'email',
    'copy',
    'native'
  ];

  const sharePlatform = validPlatforms.includes(platform) ? platform : 'general';

  let result;
  if (post.trackShare) {
    result = await post.trackShare(sharePlatform);
  } else {
    // Manual tracking if method doesn't exist
    post.shares = (post.shares || 0) + 1;
    post.totalShares = (post.totalShares || 0) + 1;
    
    if (!post.sharesByPlatform) {
      post.sharesByPlatform = new Map();
    }
    const currentCount = post.sharesByPlatform.get(sharePlatform) || 0;
    post.sharesByPlatform.set(sharePlatform, currentCount + 1);
    
    await post.save({ validateBeforeSave: false });
    result = {
      shares: post.shares,
      totalShares: post.totalShares
    };
  }

  res.json({
    status: 'success',
    success: true,
    message: 'Share tracked successfully',
    data: {
      shares: result.shares,
      totalShares: result.totalShares,
      platform: sharePlatform
    },
  });
});

/**
 * @desc    Get share statistics for a post
 * @route   GET /api/posts/:id/shares
 * @access  Public
 */
exports.getPostShares = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).select('shares totalShares sharesByPlatform');

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const sharesByPlatform = {};
  if (post.sharesByPlatform) {
    if (post.sharesByPlatform instanceof Map) {
      post.sharesByPlatform.forEach((value, key) => {
        sharesByPlatform[key] = value;
      });
    } else {
      Object.assign(sharesByPlatform, post.sharesByPlatform);
    }
  }

  res.json({
    status: 'success',
    success: true,
    data: {
      shares: post.shares || 0,
      totalShares: post.totalShares || 0,
      sharesByPlatform
    },
  });
});

/**
 * @desc    Add comment to post
 * @route   POST /api/posts/:id/comments
 * @access  Private
 */
exports.addComment = asyncHandler(async (req, res) => {
  const isAdmin = req.isAdmin || false;
  const errors = postValidator.validateComment(req.body);
  
  if (errors) {
    return res.status(400).json({ success: false, errors });
  }

  let post = await Post.findById(req.params.id);

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  post.comments.push({
    user: req.user._id,
    author: req.user._id,
    content: req.body.content
  });

  await post.save(isAdmin ? { validateBeforeSave: false } : {});
  await post.populate('comments.user comments.author', 'firstName lastName avatar username');

  res.status(201).json({
    success: true,
    status: 'success',
    message: 'Comment added successfully',
    comments: post.comments,
    data: { comments: post.comments }
  });
});

/**
 * @desc    Delete comment
 * @route   DELETE /api/posts/:postId/comments/:commentId
 * @access  Private
 */
exports.deleteComment = asyncHandler(async (req, res) => {
  const isAdmin = req.isAdmin || false;
  let post = await Post.findById(req.params.postId);

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const comment = post.comments.id(req.params.commentId);

  if (!comment) {
    throw new ErrorResponse('Comment not found', 404);
  }

  const commentUserId = comment.user || comment.author;
  if (commentUserId.toString() !== req.user._id.toString() && !isAdmin) {
    throw new ErrorResponse('Not authorized to delete this comment', 403);
  }

  post.comments.id(req.params.commentId).deleteOne();
  await post.save(isAdmin ? { validateBeforeSave: false } : {});

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Comment permanently deleted from database'
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

  let posts = CacheUtil ? CacheUtil.get(cacheKey) : null;

  if (!posts) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const query = {
      status: 'published',
      publishedAt: { 
        $lte: new Date(),
        $gte: dateThreshold 
      },
    };

    posts = await Post.find(query)
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .limit(limit)
      .sort({ 
        engagementScore: -1, 
        likesCount: -1, 
        totalShares: -1, 
        views: -1, 
        commentsCount: -1 
      })
      .lean();

    if (CacheUtil) {
      CacheUtil.set(cacheKey, posts, 300);
    }
  }

  res.json({
    status: 'success',
    success: true,
    results: posts.length,
    count: posts.length,
    data: { posts },
    posts
  });
});

/**
 * @desc    Get most liked posts
 * @route   GET /api/posts/most-liked
 * @access  Public
 */
exports.getMostLiked = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const cacheKey = `posts:most-liked:${limit}`;

  let posts = CacheUtil ? CacheUtil.get(cacheKey) : null;

  if (!posts) {
    posts = await Post.find({
      status: 'published',
      publishedAt: { $lte: new Date() },
    })
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .sort({ likesCount: -1, publishedAt: -1 })
      .limit(limit)
      .lean();

    if (CacheUtil) {
      CacheUtil.set(cacheKey, posts, 600);
    }
  }

  res.json({
    status: 'success',
    success: true,
    results: posts.length,
    count: posts.length,
    data: { posts },
    posts
  });
});

/**
 * @desc    Get most shared posts
 * @route   GET /api/posts/most-shared
 * @access  Public
 */
exports.getMostShared = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const cacheKey = `posts:most-shared:${limit}`;

  let posts = CacheUtil ? CacheUtil.get(cacheKey) : null;

  if (!posts) {
    posts = await Post.find({
      status: 'published',
      publishedAt: { $lte: new Date() },
    })
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .sort({ totalShares: -1, publishedAt: -1 })
      .limit(limit)
      .lean();

    if (CacheUtil) {
      CacheUtil.set(cacheKey, posts, 600);
    }
  }

  res.json({
    status: 'success',
    success: true,
    results: posts.length,
    count: posts.length,
    data: { posts },
    posts
  });
});

/**
 * @desc    Get featured posts
 * @route   GET /api/posts/featured
 * @access  Public
 */
exports.getFeaturedPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  const posts = await Post.find({ 
    isFeatured: true, 
    status: 'published',
    publishedAt: { $lte: new Date() }
  })
    .populate('author', 'firstName lastName avatar username')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .limit(limit)
    .sort({ publishedAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    status: 'success',
    count: posts.length,
    results: posts.length,
    posts,
    data: { posts }
  });
});

/**
 * @desc    Toggle featured status (admin only)
 * @route   PUT /api/posts/:id/featured
 * @access  Private/Admin
 */
exports.toggleFeatured = asyncHandler(async (req, res) => {
  let post = await Post.findById(req.params.id);

  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  post.isFeatured = !post.isFeatured;
  await post.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    status: 'success',
    message: `Post ${post.isFeatured ? 'featured' : 'unfeatured'} successfully`,
    isFeatured: post.isFeatured,
    post
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

  const query = { 
    author: req.params.authorId, 
    status: 'published',
    publishedAt: { $lte: new Date() }
  };

  const posts = await Post.find(query)
    .populate('author', 'firstName lastName avatar username')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .skip(skip)
    .limit(limit)
    .sort({ publishedAt: -1 })
    .lean();

  const total = await Post.countDocuments(query);

  res.status(200).json({
    success: true,
    status: 'success',
    count: posts.length,
    results: posts.length,
    total,
    pages: Math.ceil(total / limit),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    posts,
    data: { posts }
  });
});

/**
 * @desc    Get posts by category
 * @route   GET /api/posts/category/:category
 * @access  Public
 */
exports.getPostsByCategory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = {
    category: req.params.category,
    status: 'published',
    publishedAt: { $lte: new Date() }
  };

  const posts = await Post.find(query)
    .populate('author', 'firstName lastName avatar username')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .limit(limit)
    .skip(skip)
    .sort({ publishedAt: -1 })
    .lean();

  const total = await Post.countDocuments(query);

  res.status(200).json({
    success: true,
    status: 'success',
    count: posts.length,
    results: posts.length,
    total,
    pages: Math.ceil(total / limit),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    posts,
    data: { posts }
  });
});

module.exports = exports;