const Personalization = require('../models/Personalization.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get personalized content
 * @route   GET /api/personalization/content
 * @access  Private
 */
exports.getPersonalizedContent = asyncHandler(async (req, res) => {
  const { limit = 20, type = 'post' } = req.query;

  let personalization = await Personalization.findOne({ user: req.user._id });

  if (!personalization) {
    personalization = await Personalization.create({
      user: req.user._id,
      preferences: {
        language: 'en',
        theme: 'light',
      },
    });
  }

  // Build personalized query
  const query = { status: 'published' };
  
  if (personalization.favoriteCategories.length > 0) {
    query.category = { $in: personalization.favoriteCategories };
  }

  if (personalization.favoriteAuthors.length > 0) {
    query.author = { $in: personalization.favoriteAuthors };
  }

  if (personalization.interests.length > 0) {
    query.$or = [
      { tags: { $in: personalization.interests } },
      { title: { $regex: personalization.interests.join('|'), $options: 'i' } },
    ];
  }

  const content = await Post.find(query)
    .populate('author', 'username avatar')
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.json({
    status: 'success',
    data: {
      content,
      personalization: {
        interests: personalization.interests,
        favoriteCategories: personalization.favoriteCategories,
        favoriteAuthors: personalization.favoriteAuthors,
      },
    },
  });
});

/**
 * @desc    Update personalization preferences
 * @route   PATCH /api/personalization/preferences
 * @access  Private
 */
exports.updatePreferences = asyncHandler(async (req, res) => {
  const {
    theme,
    fontSize,
    layout,
    interests,
    favoriteCategories,
    favoriteAuthors,
  } = req.body;

  let personalization = await Personalization.findOne({ user: req.user._id });

  if (!personalization) {
    personalization = await Personalization.create({
      user: req.user._id,
      preferences: {},
    });
  }

  if (theme) personalization.preferences.theme = theme;
  if (fontSize) personalization.preferences.fontSize = fontSize;
  if (layout) personalization.preferences.layout = layout;
  if (interests) personalization.interests = interests;
  if (favoriteCategories) personalization.favoriteCategories = favoriteCategories;
  if (favoriteAuthors) personalization.favoriteAuthors = favoriteAuthors;

  await personalization.save();

  res.json({
    status: 'success',
    data: { personalization },
  });
});

