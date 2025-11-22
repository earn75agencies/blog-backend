const Webhook = require('../models/Webhook.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const crypto = require('crypto');
const axios = require('axios');

/**
 * @desc    Create webhook
 * @route   POST /api/webhooks
 * @access  Private
 */
exports.createWebhook = asyncHandler(async (req, res) => {
  const { name, url, events, headers } = req.body;

  if (!name || !url || !events || events.length === 0) {
    throw new ErrorResponse('Name, URL, and events are required', 400);
  }

  const webhook = await Webhook.create({
    name,
    url,
    events,
    headers: headers || {},
    owner: req.user._id,
    isActive: true,
  });

  res.status(201).json({
    status: 'success',
    message: 'Webhook created successfully',
    data: {
      webhook: {
        id: webhook._id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        // Don't expose secret in response
      },
    },
  });
});

/**
 * @desc    Get user webhooks
 * @route   GET /api/webhooks
 * @access  Private
 */
exports.getWebhooks = asyncHandler(async (req, res) => {
  const webhooks = await Webhook.find({ owner: req.user._id })
    .select('-secret')
    .sort({ createdAt: -1 });

  res.json({
    status: 'success',
    results: webhooks.length,
    data: {
      webhooks,
    },
  });
});

/**
 * @desc    Update webhook
 * @route   PUT /api/webhooks/:id
 * @access  Private
 */
exports.updateWebhook = asyncHandler(async (req, res) => {
  const webhook = await Webhook.findById(req.params.id);
  
  if (!webhook) {
    throw new ErrorResponse('Webhook not found', 404);
  }

  if (webhook.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this webhook', 403);
  }

  const { name, url, events, headers, isActive } = req.body;

  if (name) webhook.name = name;
  if (url) webhook.url = url;
  if (events) webhook.events = events;
  if (headers) webhook.headers = headers;
  if (isActive !== undefined) webhook.isActive = isActive;

  await webhook.save();

  res.json({
    status: 'success',
    message: 'Webhook updated successfully',
    data: {
      webhook: {
        id: webhook._id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
      },
    },
  });
});

/**
 * @desc    Delete webhook
 * @route   DELETE /api/webhooks/:id
 * @access  Private
 */
exports.deleteWebhook = asyncHandler(async (req, res) => {
  const webhook = await Webhook.findById(req.params.id);
  
  if (!webhook) {
    throw new ErrorResponse('Webhook not found', 404);
  }

  if (webhook.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to delete this webhook', 403);
  }

  await webhook.remove();

  res.json({
    status: 'success',
    message: 'Webhook deleted successfully',
  });
});

/**
 * @desc    Trigger webhook (internal use)
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
exports.triggerWebhook = async (event, data) => {
  try {
    const webhooks = await Webhook.find({
      events: event,
      isActive: true,
    });

    for (const webhook of webhooks) {
      try {
        const signature = generateSignature(JSON.stringify(data), webhook.secret);
        
        await axios.post(webhook.url, {
          event,
          data,
          timestamp: new Date().toISOString(),
        }, {
          headers: {
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            ...webhook.headers,
          },
          timeout: 5000,
        });

        webhook.successCount += 1;
        webhook.lastTriggered = new Date();
        await webhook.save();
      } catch (error) {
        webhook.failureCount += 1;
        webhook.lastError = error.message;
        await webhook.save();
        console.error(`Webhook ${webhook._id} failed:`, error.message);
      }
    }
  } catch (error) {
    console.error('Webhook trigger error:', error);
  }
};

/**
 * Generate webhook signature
 */
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

module.exports.triggerWebhook = exports.triggerWebhook;

