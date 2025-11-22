const Comment = require('../models/Comment.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const notificationService = require('../services/notification.service');

/**
 * @desc    Get all comments for a post
 * @route   GET /api/comments/post/:postId
 * @access  Public
 */
exports.getComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Verify post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Get top-level comments only
  const comments = await Comment.findApproved({
    post: postId,
    parentComment: null,
  })
    .populate('author', 'username avatar firstName lastName')
    .populate('replyCount')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Comment.countDocuments({
    post: postId,
    parentComment: null,
    isApproved: true,
    isSpam: false,
  });

  res.json({
    status: 'success',
    results: comments.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      comments,
    },
  });
});

/**
 * @desc    Get single comment
 * @route   GET /api/comments/:id
 * @access  Public
 */
exports.getComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id)
    .populate('author', 'username avatar firstName lastName')
    .populate('post', 'title slug')
    .populate({
      path: 'replies',
      populate: {
        path: 'author',
        select: 'username avatar firstName lastName',
      },
    });

  if (!comment || !comment.isApproved) {
    throw new ErrorResponse('Comment not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      comment,
    },
  });
});

/**
 * @desc    Create comment
 * @route   POST /api/comments
 * @access  Private
 */
exports.createComment = asyncHandler(async (req, res) => {
  const { content, post, parentComment } = req.body;

  // Verify post exists
  const postDoc = await Post.findById(post);
  if (!postDoc) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check if post allows comments
  if (!postDoc.allowComments) {
    throw new ErrorResponse('Comments are disabled for this post', 400);
  }

  // If it's a reply, verify parent comment exists
  if (parentComment) {
    const parent = await Comment.findById(parentComment);
    if (!parent) {
      throw new ErrorResponse('Parent comment not found', 404);
    }
    if (parent.post.toString() !== post) {
      throw new ErrorResponse('Parent comment does not belong to this post', 400);
    }
  }

  const comment = await Comment.create({
    content,
    post,
    author: req.user._id,
    parentComment: parentComment || null,
  });

  const populatedComment = await Comment.findById(comment._id)
    .populate('author', 'username avatar firstName lastName')
    .populate('replyCount');

  // Create notification if comment is not a reply
  if (!parentComment && postDoc.author.toString() !== req.user._id.toString()) {
    await notificationService.createCommentNotification(
      post,
      comment._id.toString(),
      req.user._id.toString(),
      postDoc.author.toString()
    );
  }

  // Create notification if comment is a reply
  if (parentComment) {
    const parent = await Comment.findById(parentComment).populate('author');
    if (parent && parent.author._id.toString() !== req.user._id.toString()) {
      await notificationService.createCommentReplyNotification(
        post,
        comment._id.toString(),
        req.user._id.toString(),
        parent.author._id.toString()
      );
    }
  }

  res.status(201).json({
    status: 'success',
    message: 'Comment created successfully',
    data: {
      comment: populatedComment,
    },
  });
});

/**
 * @desc    Update comment
 * @route   PUT /api/comments/:id
 * @access  Private
 */
exports.updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    throw new ErrorResponse('Comment not found', 404);
  }

  // Check authorization
  if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this comment', 403);
  }

  comment.content = content;
  await comment.markAsEdited();
  await comment.save();

  const updatedComment = await Comment.findById(comment._id)
    .populate('author', 'username avatar firstName lastName')
    .populate('replyCount');

  res.json({
    status: 'success',
    message: 'Comment updated successfully',
    data: {
      comment: updatedComment,
    },
  });
});

/**
 * @desc    Delete comment
 * @route   DELETE /api/comments/:id
 * @access  Private
 */
exports.deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    throw new ErrorResponse('Comment not found', 404);
  }

  // Check authorization
  if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to delete this comment', 403);
  }

  await comment.remove();

  res.json({
    status: 'success',
    message: 'Comment deleted successfully',
  });
});

/**
 * @desc    Like comment
 * @route   POST /api/comments/:id/like
 * @access  Private
 */
exports.likeComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    throw new ErrorResponse('Comment not found', 404);
  }

  const likesCount = await comment.toggleLike(req.user._id);

  res.json({
    status: 'success',
    message: 'Comment liked successfully',
    data: {
      likes: likesCount,
    },
  });
});

/**
 * @desc    Unlike comment
 * @route   POST /api/comments/:id/unlike
 * @access  Private
 */
exports.unlikeComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    throw new ErrorResponse('Comment not found', 404);
  }

  const likesCount = await comment.toggleLike(req.user._id);

  res.json({
    status: 'success',
    message: 'Comment unliked successfully',
    data: {
      likes: likesCount,
    },
  });
});

/**
 * @desc    Get comment replies
 * @route   GET /api/comments/:id/replies
 * @access  Public
 */
exports.getCommentReplies = asyncHandler(async (req, res) => {
  const replies = await Comment.findApproved({
    parentComment: req.params.id,
  })
    .populate('author', 'username avatar firstName lastName')
    .sort({ createdAt: 1 });

  res.json({
    status: 'success',
    results: replies.length,
    data: {
      replies,
    },
  });
});

