const mongoose = require('mongoose');
const SEOScore = require('../models/SEOScore.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Analyze SEO score
 * @route   POST /api/seo/analyze
 * @access  Private
 */
exports.analyzeSEO = asyncHandler(async (req, res) => {
  const { contentType, contentId } = req.body;

  let seoScore = await SEOScore.findOne({
    content: contentId,
    contentType,
  });

  if (!seoScore) {
    seoScore = await SEOScore.create({
      content: contentId,
      contentType,
      score: 0,
      factors: {},
      recommendations: [],
    });
  }

  // Get content
  const ContentModel = mongoose.model(contentType === 'post' ? 'Post' : 'Content');
  const content = await ContentModel.findById(contentId);
  if (!content) {
    throw new ErrorResponse('Content not found', 404);
  }

  // Calculate SEO score
  let score = 0;
  const factors = {};
  const recommendations = [];

  // Title optimization
  if (content.title && content.title.length >= 30 && content.title.length <= 60) {
    factors.title = { score: 10, optimized: true };
    score += 10;
  } else {
    factors.title = { score: 0, optimized: false };
    recommendations.push({
      type: 'important',
      field: 'title',
      message: 'Title should be between 30-60 characters',
      action: 'Update title length',
    });
  }

  // Meta description
  if (content.seoDescription && content.seoDescription.length >= 120 && content.seoDescription.length <= 160) {
    factors.metaDescription = { score: 10, optimized: true };
    score += 10;
  } else {
    factors.metaDescription = { score: 0, optimized: false };
    recommendations.push({
      type: 'important',
      field: 'metaDescription',
      message: 'Meta description should be between 120-160 characters',
      action: 'Update meta description',
    });
  }

  // Keywords
  if (content.seoKeywords && content.seoKeywords.length > 0) {
    factors.keywords = { score: 10, optimized: true };
    score += 10;
  } else {
    factors.keywords = { score: 0, optimized: false };
    recommendations.push({
      type: 'suggestion',
      field: 'keywords',
      message: 'Add SEO keywords',
      action: 'Add relevant keywords',
    });
  }

  // Update SEO score
  seoScore.score = score;
  seoScore.factors = factors;
  seoScore.recommendations = recommendations;
  seoScore.lastAnalyzed = new Date();
  await seoScore.save();

  res.json({
    status: 'success',
    data: { seoScore },
  });
});

/**
 * @desc    Get SEO recommendations
 * @route   GET /api/seo/:contentType/:contentId/recommendations
 * @access  Private
 */
exports.getSEORecommendations = asyncHandler(async (req, res) => {
  const { contentType, contentId } = req.params;

  const seoScore = await SEOScore.findOne({
    content: contentId,
    contentType,
  });

  if (!seoScore) {
    throw new ErrorResponse('SEO analysis not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      recommendations: seoScore.recommendations,
      score: seoScore.score,
    },
  });
});

