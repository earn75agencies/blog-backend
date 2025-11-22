const APIDeveloper = require('../models/APIDeveloper.model');
const Plugin = require('../models/Plugin.model');
const Webhook = require('../models/Webhook.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const crypto = require('crypto');

/**
 * @desc    Register as API developer
 * @route   POST /api/developers/register
 * @access  Private
 */
exports.registerDeveloper = asyncHandler(async (req, res) => {
  let developer = await APIDeveloper.findOne({ user: req.user._id });

  if (developer) {
    throw new ErrorResponse('Already registered as developer', 400);
  }

  developer = await APIDeveloper.create({
    user: req.user._id,
    plan: 'free',
  });

  res.status(201).json({
    status: 'success',
    data: { developer },
  });
});

/**
 * @desc    Generate API key
 * @route   POST /api/developers/api-keys
 * @access  Private
 */
exports.generateAPIKey = asyncHandler(async (req, res) => {
  const { name, scopes, rateLimit } = req.body;

  const developer = await APIDeveloper.findOne({ user: req.user._id });
  if (!developer) {
    throw new ErrorResponse('Not registered as developer', 403);
  }

  const apiKey = crypto.randomBytes(32).toString('hex');

  developer.apiKeys.push({
    key: apiKey,
    name: name || 'Default Key',
    scopes: scopes || ['read'],
    rateLimit: rateLimit || { requests: 1000, period: 'hour' },
  });

  await developer.save();

  res.status(201).json({
    status: 'success',
    data: {
      apiKey,
      keyId: developer.apiKeys[developer.apiKeys.length - 1]._id,
    },
  });
});

/**
 * @desc    Get developer dashboard
 * @route   GET /api/developers/dashboard
 * @access  Private
 */
exports.getDeveloperDashboard = asyncHandler(async (req, res) => {
  const developer = await APIDeveloper.findOne({ user: req.user._id })
    .populate('badges');

  if (!developer) {
    throw new ErrorResponse('Not registered as developer', 403);
  }

  const plugins = await Plugin.find({ developer: req.user._id });
  const webhooks = await Webhook.find({ user: req.user._id });

  res.json({
    status: 'success',
    data: {
      developer,
      plugins: plugins.length,
      webhooks: webhooks.length,
      stats: developer.usage,
    },
  });
});

/**
 * @desc    Create plugin
 * @route   POST /api/plugins
 * @access  Private
 */
exports.createPlugin = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    category,
    price,
    isFree,
    dependencies,
    permissions,
    tags,
  } = req.body;

  const slugify = require('../utils/string.util').slugify;
  let slug = slugify(name);

  let existingPlugin = await Plugin.findOne({ slug });
  let counter = 1;
  while (existingPlugin) {
    slug = `${slugify(name)}-${counter}`;
    existingPlugin = await Plugin.findOne({ slug });
    counter++;
  }

  const plugin = await Plugin.create({
    name,
    slug,
    description,
    developer: req.user._id,
    category,
    price: isFree ? 0 : price,
    isFree: isFree !== undefined ? isFree : true,
    dependencies: dependencies || [],
    permissions: permissions || [],
    tags: tags || [],
    status: 'pending',
    versions: [
      {
        version: '1.0.0',
        releaseDate: new Date(),
        isActive: true,
      },
    ],
  });

  res.status(201).json({
    status: 'success',
    data: { plugin },
  });
});

/**
 * @desc    Get plugins marketplace
 * @route   GET /api/plugins
 * @access  Public
 */
exports.getPlugins = asyncHandler(async (req, res) => {
  const { category, search, sort = 'downloads', limit = 20, page = 1 } = req.query;

  const query = { status: 'approved' };
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = {};
  sortObj[sort] = -1;

  const plugins = await Plugin.find(query)
    .populate('developer', 'username avatar')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Plugin.countDocuments(query);

  res.json({
    status: 'success',
    data: {
      plugins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

