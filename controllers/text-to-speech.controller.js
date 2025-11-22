const TextToSpeech = require('../models/TextToSpeech.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Generate text-to-speech for post
 * @route   POST /api/posts/:postId/text-to-speech
 * @access  Private
 */
exports.generateTextToSpeech = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { language = 'en', voice = 'neutral', speed = 1.0, pitch = 1.0 } = req.body;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check if TTS already exists
  let tts = await TextToSpeech.findOne({ post: postId });

  if (tts) {
    return res.json({
      status: 'success',
      data: { tts },
    });
  }

  // Generate TTS audio using TTS service
  const ttsService = require('../services/text-to-speech.service');
  
  let ttsResult;
  try {
    ttsResult = await ttsService.generateAudio(post.content, {
      language,
      voice,
      speed,
      pitch,
      format: 'mp3',
    });
  } catch (error) {
    console.error('TTS generation failed:', error);
    throw new ErrorResponse(`Failed to generate text-to-speech: ${error.message}`, 500);
  }

  tts = await TextToSpeech.create({
    post: postId,
    audioUrl: ttsResult.audioUrl,
    language: ttsResult.language,
    voice: ttsResult.voice,
    speed: ttsResult.speed,
    pitch: ttsResult.pitch,
    duration: ttsResult.duration,
    format: ttsResult.format,
  });

  res.status(201).json({
    status: 'success',
    message: 'Text-to-speech generation started',
    data: { tts },
  });
});

/**
 * @desc    Get text-to-speech for post
 * @route   GET /api/posts/:postId/text-to-speech
 * @access  Public
 */
exports.getTextToSpeech = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const tts = await TextToSpeech.findOne({ post: postId });

  if (!tts) {
    throw new ErrorResponse('Text-to-speech not found', 404);
  }

  // Increment plays
  tts.plays += 1;
  await tts.save();

  res.json({
    status: 'success',
    data: { tts },
  });
});

/**
 * @desc    Update text-to-speech settings
 * @route   PATCH /api/posts/:postId/text-to-speech
 * @access  Private
 */
exports.updateTextToSpeech = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { language, voice, speed, pitch } = req.body;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ErrorResponse('Post not found', 404);
  }

  // Check permissions
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  let tts = await TextToSpeech.findOne({ post: postId });

  if (!tts) {
    throw new ErrorResponse('Text-to-speech not found', 404);
  }

  if (language) tts.language = language;
  if (voice) tts.voice = voice;
  if (speed) tts.speed = speed;
  if (pitch) tts.pitch = pitch;

  await tts.save();

  res.json({
    status: 'success',
    data: { tts },
  });
});

