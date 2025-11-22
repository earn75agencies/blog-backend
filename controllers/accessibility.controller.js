const AccessibilityAudit = require('../models/AccessibilityAudit.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Run accessibility audit
 * @route   POST /api/posts/:postId/accessibility/audit
 * @access  Private
 */
exports.runAccessibilityAudit = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check permissions
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  // Run accessibility checks (simplified - in production, use actual a11y tools)
  const issues = [];
  let score = 100;

  // Check for alt text on images
  const imageRegex = /<img[^>]+>/g;
  const images = post.content.match(imageRegex) || [];
  images.forEach((img, index) => {
    if (!img.includes('alt=')) {
      issues.push({
        type: 'alt-text',
        severity: 'error',
        description: `Image ${index + 1} is missing alt text`,
        element: `img-${index + 1}`,
        suggestion: 'Add descriptive alt text to all images',
        fixed: false,
      });
      score -= 5;
    }
  });

  // Check heading structure
  const headingRegex = /<h([1-6])[^>]*>/g;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(post.content)) !== null) {
    headings.push(parseInt(match[1]));
  }

  if (headings.length > 0 && headings[0] !== 1) {
    issues.push({
      type: 'heading',
      severity: 'warning',
      description: 'First heading should be h1',
      element: 'heading-structure',
      suggestion: 'Ensure proper heading hierarchy (h1 → h2 → h3)',
      fixed: false,
    });
    score -= 3;
  }

  // Check color contrast (simplified)
  if (post.content.includes('color:')) {
    issues.push({
      type: 'color',
      severity: 'warning',
      description: 'Inline color styles may have contrast issues',
      element: 'content',
      suggestion: 'Use CSS classes with tested contrast ratios',
      fixed: false,
    });
    score -= 2;
  }

  // Check for keyboard navigation
  const interactiveElements = post.content.match(/<a[^>]+>|<button[^>]+>|<input[^>]+>/g) || [];
  if (interactiveElements.length > 0) {
    issues.push({
      type: 'keyboard',
      severity: 'info',
      description: 'Ensure all interactive elements are keyboard accessible',
      element: 'interactive-elements',
      suggestion: 'Test keyboard navigation',
      fixed: false,
    });
  }

  // Determine WCAG level
  let wcagLevel = 'none';
  if (score >= 95) wcagLevel = 'AAA';
  else if (score >= 85) wcagLevel = 'AA';
  else if (score >= 70) wcagLevel = 'A';

  // Update or create audit
  const audit = await AccessibilityAudit.findOneAndUpdate(
    { post: postId },
    {
      score: Math.max(0, score),
      issues,
      wcagLevel,
      features: {
        altText: !issues.some(i => i.type === 'alt-text'),
        keyboardNav: true,
      },
      lastAudited: new Date(),
    },
    { upsert: true, new: true }
  );

  res.json({
    status: 'success',
    data: { audit },
  });
});

/**
 * @desc    Get accessibility audit
 * @route   GET /api/posts/:postId/accessibility
 * @access  Private
 */
exports.getAccessibilityAudit = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  let audit = await AccessibilityAudit.findOne({ post: postId });

  if (!audit) {
    // Run initial audit
    return exports.runAccessibilityAudit(req, res);
  }

  res.json({
    status: 'success',
    data: { audit },
  });
});

/**
 * @desc    Mark issue as fixed
 * @route   PATCH /api/posts/:postId/accessibility/issues/:issueId
 * @access  Private
 */
exports.markIssueFixed = asyncHandler(async (req, res) => {
  const { postId, issueId } = req.params;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  const audit = await AccessibilityAudit.findOne({ post: postId });
  if (!audit) {
    throw new ErrorResponse('Audit not found', 404);
  }

  const issue = audit.issues.id(issueId);
  if (!issue) {
    throw new ErrorResponse('Issue not found', 404);
  }

  issue.fixed = true;
  await audit.save();

  res.json({
    status: 'success',
    data: { audit },
  });
});

