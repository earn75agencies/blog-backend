const ContentLicense = require('../models/ContentLicense.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get content license
 * @route   GET /api/posts/:postId/license
 * @access  Public
 */
exports.getContentLicense = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const license = await ContentLicense.findOne({ post: postId });

  if (!license) {
    // Return default license
    return res.json({
      status: 'success',
      data: {
        license: {
          licenseType: 'all-rights-reserved',
          allowCommercialUse: false,
          allowModifications: false,
          requireAttribution: true,
        },
      },
    });
  }

  res.json({
    status: 'success',
    data: { license },
  });
});

/**
 * @desc    Create or update content license
 * @route   POST /api/posts/:postId/license
 * @access  Private
 */
exports.setContentLicense = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const {
    licenseType,
    customTerms,
    allowCommercialUse,
    allowModifications,
    requireAttribution,
    allowSyndication,
    pricing,
    usageRights,
  } = req.body;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check permissions
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  const license = await ContentLicense.findOneAndUpdate(
    { post: postId },
    {
      post: postId,
      author: req.user._id,
      licenseType: licenseType || 'all-rights-reserved',
      customTerms,
      allowCommercialUse: allowCommercialUse || false,
      allowModifications: allowModifications || false,
      requireAttribution: requireAttribution !== undefined ? requireAttribution : true,
      allowSyndication: allowSyndication || false,
      pricing: pricing || { type: 'free', amount: 0, currency: 'USD' },
      usageRights: usageRights || {
        print: false,
        digital: false,
        broadcast: false,
        derivative: false,
      },
    },
    { upsert: true, new: true }
  );

  res.json({
    status: 'success',
    data: { license },
  });
});

