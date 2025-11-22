const Translation = require('../models/Translation.model');
const Personalization = require('../models/Personalization.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Translate content
 * @route   POST /api/i18n/translate
 * @access  Private
 */
exports.translateContent = asyncHandler(async (req, res) => {
  const { contentType, contentId, language, locale, translatedFields, translationMethod } = req.body;

  // Check if translation exists
  let translation = await Translation.findOne({
    content: contentId,
    contentType,
    language,
  });

  if (translation) {
    translation.translatedFields = translatedFields;
    translation.translationMethod = translationMethod || 'manual';
    translation.status = 'pending';
    await translation.save();
  } else {
    translation = await Translation.create({
      content: contentId,
      contentType,
      language,
      locale: locale || language,
      translatedFields,
      translator: req.user._id,
      translationMethod: translationMethod || 'manual',
      status: 'pending',
    });
  }

  res.status(201).json({
    status: 'success',
    data: { translation },
  });
});

/**
 * @desc    Get content translations
 * @route   GET /api/i18n/:contentType/:contentId
 * @access  Public
 */
exports.getTranslations = asyncHandler(async (req, res) => {
  const { contentType, contentId } = req.params;
  const { language } = req.query;

  const query = {
    content: contentId,
    contentType,
    status: 'published',
  };
  if (language) query.language = language;

  const translations = await Translation.find(query)
    .populate('translator', 'username avatar');

  res.json({
    status: 'success',
    data: { translations },
  });
});

/**
 * @desc    Set user language preference
 * @route   PATCH /api/i18n/preferences
 * @access  Private
 */
exports.setLanguagePreference = asyncHandler(async (req, res) => {
  const { language, locale, timezone, currency, rtl } = req.body;

  let personalization = await Personalization.findOne({ user: req.user._id });

  if (!personalization) {
    personalization = await Personalization.create({
      user: req.user._id,
      preferences: {
        language: language || 'en',
        locale: locale || language || 'en',
        timezone: timezone || 'UTC',
        currency: currency || 'USD',
        rtl: rtl || false,
      },
    });
  } else {
    if (language) personalization.preferences.language = language;
    if (locale) personalization.preferences.locale = locale;
    if (timezone) personalization.preferences.timezone = timezone;
    if (currency) personalization.preferences.currency = currency;
    if (rtl !== undefined) personalization.preferences.rtl = rtl;
    await personalization.save();
  }

  res.json({
    status: 'success',
    data: { personalization },
  });
});

