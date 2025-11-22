const { asyncHandler } = require('../../../utils/asyncHandler');
const ErrorResponse = require('../../../utils/ErrorResponse');
const User = require('../../../models/User.model');
const Notification = require('../../../models/Notification.model');
const axios = require('axios');

/**
 * Send SMS notification
 * Supports multiple SMS providers: Twilio, AWS SNS, or custom webhook
 */
exports.sendSMS = asyncHandler(async (req, res) => {
  const { phoneNumber, message, userId } = req.body;

  if (!phoneNumber || !message) {
    throw new ErrorResponse('Phone number and message are required', 400);
  }

  // Validate phone number format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
    throw new ErrorResponse('Invalid phone number format', 400);
  }

  // Get user if userId provided
  let user = null;
  if (userId) {
    user = await User.findById(userId);
    if (!user) {
      throw new ErrorResponse('User not found', 404);
    }
  }

  const smsProvider = process.env.SMS_PROVIDER || 'webhook';
  let result;

  try {
    switch (smsProvider) {
      case 'twilio':
        result = await sendViaTwilio(phoneNumber, message);
        break;
      case 'aws':
        result = await sendViaAWS(phoneNumber, message);
        break;
      case 'webhook':
      default:
        result = await sendViaWebhook(phoneNumber, message);
        break;
    }

    // Create notification record if userId provided
    if (user) {
      await Notification.create({
        user: user._id,
        type: 'system',
        title: 'SMS Sent',
        message: `SMS sent to ${phoneNumber}`,
        channels: ['sms'],
        sentChannels: [{
          channel: 'sms',
          sentAt: new Date(),
          status: result.success ? 'sent' : 'failed',
        }],
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'SMS sent successfully',
      data: {
        messageId: result.messageId,
        provider: smsProvider,
        status: result.status,
      },
    });
  } catch (error) {
    console.error('SMS sending failed:', error);

    // Log failure in notification if user exists
    if (user) {
      await Notification.create({
        user: user._id,
        type: 'system',
        title: 'SMS Failed',
        message: `Failed to send SMS to ${phoneNumber}: ${error.message}`,
        channels: ['sms'],
        sentChannels: [{
          channel: 'sms',
          sentAt: new Date(),
          status: 'failed',
        }],
      });
    }

    throw new ErrorResponse(`Failed to send SMS: ${error.message}`, 500);
  }
});

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(phoneNumber, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured');
  }

  const response = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    new URLSearchParams({
      From: fromNumber,
      To: phoneNumber,
      Body: message,
    }),
    {
      auth: {
        username: accountSid,
        password: authToken,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return {
    success: true,
    messageId: response.data.sid,
    status: response.data.status,
  };
}

/**
 * Send SMS via AWS SNS
 */
async function sendViaAWS(phoneNumber, message) {
  const awsRegion = process.env.AWS_REGION || 'us-east-1';
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('AWS credentials not configured');
  }

  // Note: Full AWS SNS implementation would require @aws-sdk/client-sns
  // This is a placeholder structure - in production, install and use the SDK
  const AWS = require('aws-sdk');
  const sns = new AWS.SNS({
    region: awsRegion,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  });

  const params = {
    PhoneNumber: phoneNumber,
    Message: message,
  };

  const result = await sns.publish(params).promise();

  return {
    success: true,
    messageId: result.MessageId,
    status: 'sent',
  };
}

/**
 * Send SMS via webhook (custom SMS service)
 */
async function sendViaWebhook(phoneNumber, message) {
  const webhookUrl = process.env.SMS_WEBHOOK_URL;

  if (!webhookUrl) {
    // Fallback: log the SMS (for development/testing)
    console.log(`[SMS] To: ${phoneNumber}, Message: ${message}`);
    return {
      success: true,
      messageId: `dev_${Date.now()}`,
      status: 'sent',
    };
  }

  const response = await axios.post(webhookUrl, {
    phoneNumber,
    message,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': process.env.SMS_WEBHOOK_AUTH ? `Bearer ${process.env.SMS_WEBHOOK_AUTH}` : undefined,
    },
    timeout: 10000,
  });

  return {
    success: response.status === 200,
    messageId: response.data?.messageId || response.data?.id || `webhook_${Date.now()}`,
    status: response.data?.status || 'sent',
  };
}

/**
 * Get SMS delivery status
 */
exports.getSMSStatus = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  if (!messageId) {
    throw new ErrorResponse('Message ID is required', 400);
  }

  // Try to find notification with this message ID
  const notification = await Notification.findOne({
    'sentChannels.messageId': messageId,
    'channels': 'sms',
  });

  if (!notification) {
    throw new ErrorResponse('SMS not found', 404);
  }

  const smsChannel = notification.sentChannels.find(sc => sc.messageId === messageId);

  res.status(200).json({
    status: 'success',
    data: {
      messageId,
      status: smsChannel?.status || 'unknown',
      sentAt: smsChannel?.sentAt,
    },
  });
});

