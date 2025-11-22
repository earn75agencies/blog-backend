/**
 * Push Notification Service
 * Web and mobile push notifications
 */

const admin = require('firebase-admin');
const webpush = require('web-push');

class PushNotificationService {
  constructor() {
    this.fcmInitialized = false;
    this.webPushInitialized = false;
    this.initializeServices();
  }

  /**
   * Initialize notification services
   */
  initializeServices() {
    // Initialize FCM for mobile
    if (process.env.FCM_SERVER_KEY) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FCM_PROJECT_ID,
            privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FCM_CLIENT_EMAIL,
          }),
        });
        this.fcmInitialized = true;
      } catch (error) {
        console.error('FCM initialization error:', error);
      }
    }

    // Initialize Web Push
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@gidi-global.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      this.webPushInitialized = true;
    }
  }

  /**
   * Send push notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Send result
   */
  async sendPushNotification({
    userId,
    title,
    body,
    data = {},
    icon,
    badge,
    image,
    url,
    deviceType = 'auto', // 'web', 'mobile', 'auto'
    deviceToken,
  }) {
    const results = {
      web: null,
      mobile: null,
      errors: [],
    };

    // Send web push
    if (deviceType === 'web' || deviceType === 'auto') {
      try {
        results.web = await this.sendWebPush({
          userId,
          title,
          body,
          data,
          icon,
          badge,
          image,
          url,
          deviceToken,
        });
      } catch (error) {
        results.errors.push({ type: 'web', error: error.message });
      }
    }

    // Send mobile push
    if (deviceType === 'mobile' || deviceType === 'auto') {
      try {
        results.mobile = await this.sendMobilePush({
          userId,
          title,
          body,
          data,
          deviceToken,
        });
      } catch (error) {
        results.errors.push({ type: 'mobile', error: error.message });
      }
    }

    return results;
  }

  /**
   * Send web push notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Send result
   */
  async sendWebPush({ userId, title, body, data, icon, badge, image, url, deviceToken }) {
    if (!this.webPushInitialized) {
      throw new Error('Web push not initialized');
    }

    // Get user's subscription from database
    const Subscription = require('../../models/PushSubscription.model');
    const subscriptions = await Subscription.find({
      user: userId,
      type: 'web',
      isActive: true,
    });

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icon-192x192.png',
      badge: badge || '/badge-72x72.png',
      image,
      data: {
        ...data,
        url: url || '/',
      },
    });

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          payload
        );
        sent++;
      } catch (error) {
        failed++;
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          subscription.isActive = false;
          await subscription.save();
        }
      }
    }

    return { sent, failed };
  }

  /**
   * Send mobile push notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Send result
   */
  async sendMobilePush({ userId, title, body, data, deviceToken }) {
    if (!this.fcmInitialized) {
      throw new Error('FCM not initialized');
    }

    // Get user's device tokens
    const Subscription = require('../../models/PushSubscription.model');
    const subscriptions = await Subscription.find({
      user: userId,
      type: { $in: ['ios', 'android'] },
      isActive: true,
    });

    if (subscriptions.length === 0 && !deviceToken) {
      return { sent: 0, failed: 0 };
    }

    const tokens = deviceToken
      ? [deviceToken]
      : subscriptions.map(s => s.deviceToken).filter(Boolean);

    if (tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...Object.entries(data).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {}),
      },
      tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      
      // Handle invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            invalidTokens.push(tokens[idx]);
          }
        });

        // Deactivate invalid subscriptions
        await Subscription.updateMany(
          { deviceToken: { $in: invalidTokens } },
          { isActive: false }
        );
      }

      return {
        sent: response.successCount,
        failed: response.failureCount,
      };
    } catch (error) {
      console.error('FCM send error:', error);
      throw error;
    }
  }

  /**
   * Send batch notifications
   * @param {Array} notifications - Array of notification data
   * @returns {Promise<Object>} Batch send results
   */
  async sendBatch(notifications) {
    const results = {
      total: notifications.length,
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const notification of notifications) {
      try {
        const result = await this.sendPushNotification(notification);
        results.sent += (result.web?.sent || 0) + (result.mobile?.sent || 0);
        results.failed += (result.web?.failed || 0) + (result.mobile?.failed || 0);
        if (result.errors.length > 0) {
          results.errors.push(...result.errors);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ notification, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new PushNotificationService();

