const PostVersion = require('../models/PostVersion.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get post versions
 * @route   GET /api/posts/:postId/versions
 * @access  Private
 */
exports.getPostVersions = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check permissions
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  const versions = await PostVersion.find({ post: postId })
    .sort({ version: -1 })
    .populate('author', 'username avatar');

  res.json({
    status: 'success',
    data: { versions },
  });
});

/**
 * @desc    Get specific version
 * @route   GET /api/posts/:postId/versions/:version
 * @access  Private
 */
exports.getPostVersion = asyncHandler(async (req, res) => {
  const { postId, version } = req.params;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check permissions
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  const postVersion = await PostVersion.findOne({
    post: postId,
    version: parseInt(version),
  }).populate('author', 'username avatar');

  if (!postVersion) {
    throw new ErrorResponse('Version not found', 404);
  }

  res.json({
    status: 'success',
    data: { version: postVersion },
  });
});

/**
 * @desc    Create version snapshot
 * @route   POST /api/posts/:postId/versions
 * @access  Private
 */
exports.createPostVersion = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { reason, notes } = req.body;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check permissions
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  // Get latest version number
  const latestVersion = await PostVersion.findOne({ post: postId })
    .sort({ version: -1 })
    .select('version');

  const versionNumber = latestVersion ? latestVersion.version + 1 : 1;

  const postVersion = await PostVersion.create({
    post: postId,
    version: versionNumber,
    author: req.user._id,
    content: {
      title: post.title,
      excerpt: post.excerpt,
      body: post.content,
      featuredImage: post.featuredImage,
    },
    metadata: {
      reason,
      notes,
      tags: post.tags,
      category: post.category,
    },
  });

  res.status(201).json({
    status: 'success',
    data: { version: postVersion },
  });
});

/**
 * @desc    Restore version
 * @route   POST /api/posts/:postId/versions/:version/restore
 * @access  Private
 */
exports.restorePostVersion = asyncHandler(async (req, res) => {
  const { postId, version } = req.params;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check permissions
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  const postVersion = await PostVersion.findOne({
    post: postId,
    version: parseInt(version),
  });

  if (!postVersion) {
    throw new ErrorResponse('Version not found', 404);
  }

  // Restore post content
  post.title = postVersion.content.title;
  post.excerpt = postVersion.content.excerpt;
  post.content = postVersion.content.body;
  post.featuredImage = postVersion.content.featuredImage;
  await post.save();

  // Create new version snapshot of restored state
  const latestVersion = await PostVersion.findOne({ post: postId })
    .sort({ version: -1 })
    .select('version');

  await PostVersion.create({
    post: postId,
    version: latestVersion ? latestVersion.version + 1 : 1,
    author: req.user._id,
    content: {
      title: post.title,
      excerpt: post.excerpt,
      body: post.content,
      featuredImage: post.featuredImage,
    },
    metadata: {
      reason: `Restored from version ${version}`,
      notes: 'Automatic snapshot after restore',
      tags: post.tags,
      category: post.category,
    },
  });

  res.json({
    status: 'success',
    message: 'Version restored successfully',
    data: { post },
  });
});

