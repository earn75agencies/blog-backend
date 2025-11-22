const View = require('../models/View.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Track post view
 * @route   POST /api/views
 * @access  Public
 */
exports.trackView = asyncHandler(async (req, res) => {
  const { postId } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent') || 'Unknown';
  const referrer = req.get('referrer') || null;

  // Check if view already exists (prevent duplicate views from same IP)
  const existingView = await View.findOne({
    post: postId,
    ip,
    createdAt: {
      $gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
    },
  });

  if (existingView) {
    return res.json({
      status: 'success',
      message: 'View already tracked',
    });
  }

  // Detect device type
  let device = 'unknown';
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    device = /Mobile/.test(userAgent) ? 'mobile' : 'tablet';
  } else {
    device = 'desktop';
  }

  // Detect browser
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // Detect OS
  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  // Create view record
  const view = await View.create({
    post: postId,
    user: req.user?._id || null,
    ip,
    userAgent,
    referrer,
    device,
    browser,
    os,
  });

  // Increment post views count
  await Post.findByIdAndUpdate(postId, { $inc: { views: 1 } });

  res.json({
    status: 'success',
    message: 'View tracked',
    data: {
      view,
    },
  });
});

