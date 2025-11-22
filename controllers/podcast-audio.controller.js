const Podcast = require('../models/Podcast.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Create podcast
 * @route   POST /api/podcasts
 * @access  Private
 */
exports.createPodcast = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    audioUrl,
    duration,
    series,
    transcript,
    chapters,
    highlights,
    guests,
  } = req.body;

  const slugify = require('../utils/string.util').slugify;
  let slug = slugify(title);

  let existingPodcast = await Podcast.findOne({ slug });
  let counter = 1;
  while (existingPodcast) {
    slug = `${slugify(title)}-${counter}`;
    existingPodcast = await Podcast.findOne({ slug });
    counter++;
  }

  const podcast = await Podcast.create({
    title,
    description,
    slug,
    creator: req.user._id,
    series,
    audioUrl,
    duration,
    transcript: transcript ? { text: transcript, language: 'en' } : null,
    chapters: chapters || [],
    highlights: highlights || [],
    guests: guests || [],
    status: 'draft',
  });

  res.status(201).json({
    status: 'success',
    data: { podcast },
  });
});

/**
 * @desc    Get podcasts
 * @route   GET /api/podcasts
 * @access  Public
 */
exports.getPodcasts = asyncHandler(async (req, res) => {
  const {
    creator,
    series,
    search,
    limit = 20,
    page = 1,
    sort = 'publishedAt',
  } = req.query;

  const query = { status: 'published' };
  if (creator) query.creator = creator;
  if (series) query.series = series;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = {};
  sortObj[sort] = -1;

  const podcasts = await Podcast.find(query)
    .populate('creator', 'username avatar')
    .populate('series', 'title slug')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Podcast.countDocuments(query);

  res.json({
    status: 'success',
    data: {
      podcasts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @desc    Get podcast analytics
 * @route   GET /api/podcasts/:id/analytics
 * @access  Private
 */
exports.getPodcastAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const podcast = await Podcast.findById(id);
  if (!podcast) {
    throw new ErrorResponse('Podcast not found', 404);
  }

  // Check permissions
  if (podcast.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized', 403);
  }

  res.json({
    status: 'success',
    data: {
      analytics: podcast.analytics,
      podcast: {
        title: podcast.title,
        duration: podcast.duration,
        publishedAt: podcast.publishedAt,
      },
    },
  });
});

