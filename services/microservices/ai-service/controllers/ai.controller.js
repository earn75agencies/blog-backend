const asyncHandler = require('../../../utils/asyncHandler');
const aiService = require('../../../services/ai/ai.service');
const ErrorResponse = require('../../../utils/ErrorResponse');

/**
 * Generate content
 */
exports.generateContent = asyncHandler(async (req, res) => {
  const { prompt, type, context } = req.body;

  if (!prompt) {
    throw new ErrorResponse('Prompt is required', 400);
  }

  const content = await aiService.generateContent(prompt, type || 'post', context);

  res.status(200).json({
    status: 'success',
    data: {
      content,
    },
  });
});

/**
 * Summarize text
 */
exports.summarizeText = asyncHandler(async (req, res) => {
  const { text, maxLength } = req.body;

  if (!text) {
    throw new ErrorResponse('Text is required', 400);
  }

  const summary = await aiService.summarizeText(text, maxLength || 200);

  res.status(200).json({
    status: 'success',
    data: {
      summary,
    },
  });
});

/**
 * Translate text
 */
exports.translateText = asyncHandler(async (req, res) => {
  const { text, targetLanguage, sourceLanguage } = req.body;

  if (!text || !targetLanguage) {
    throw new ErrorResponse('Text and target language are required', 400);
  }

  const translatedText = await aiService.translateText(text, targetLanguage, sourceLanguage);

  res.status(200).json({
    status: 'success',
    data: {
      translatedText,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
    },
  });
});

/**
 * Analyze sentiment
 */
exports.analyzeSentiment = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    throw new ErrorResponse('Text is required', 400);
  }

  const sentiment = await aiService.analyzeSentiment(text);

  res.status(200).json({
    status: 'success',
    data: {
      sentiment: sentiment.label || sentiment.sentiment,
      score: sentiment.score,
      confidence: sentiment.confidence,
      emotions: sentiment.emotions,
    },
  });
});

