const AnalyticsService = require('../services/analytics.service');

// Middleware to track page views
const trackPageView = async (req, res, next) => {
  try {
    // Only track GET requests to avoid duplicate tracking
    if (req.method === 'GET' && !req.path.includes('/api/')) {
      await AnalyticsService.trackPageView(req, req.user);
    }
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
  next();
};

// Middleware to track API requests
const trackApiRequest = async (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to track response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Track API call asynchronously
    setImmediate(async () => {
      try {
        await AnalyticsService.trackEvent({
          event: 'api_request',
          category: 'system',
          action: req.method.toLowerCase(),
          label: req.path,
          value: duration,
          user: req.user?._id,
          sessionId: req.sessionID,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          responseTime: duration,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
        });
      } catch (error) {
        console.error('Error tracking API request:', error);
      }
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Middleware to track user interactions
const trackUserInteraction = (event, category) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = async function(data) {
      // Track successful interactions
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            await AnalyticsService.trackUserAction(req, event, category, req.user, {
              statusCode: res.statusCode,
              responseData: data,
            });
          } catch (error) {
            console.error('Error tracking user interaction:', error);
          }
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Analytics routes controller
const analyticsController = {
  // Get analytics overview
  getOverview: async (req, res) => {
    try {
      const { dateRange = '7d' } = req.query;
      const overview = await AnalyticsService.getOverview(dateRange);
      
      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Get real-time stats
  getRealTimeStats: async (req, res) => {
    try {
      const stats = await AnalyticsService.getRealTimeStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Get content performance
  getContentPerformance: async (req, res) => {
    try {
      const { dateRange = '7d' } = req.query;
      const performance = await AnalyticsService.getContentPerformance(dateRange);
      
      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Get user analytics
  getUserAnalytics: async (req, res) => {
    try {
      const { userId } = req.params;
      const { dateRange = '30d' } = req.query;
      
      // Users can only view their own analytics unless they're admin
      if (req.user._id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
      
      const analytics = await AnalyticsService.getUserAnalytics(userId, dateRange);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Track custom event
  trackEvent: async (req, res) => {
    try {
      const { event, category, action, label, value, metadata } = req.body;
      
      if (!event || !category || !action) {
        return res.status(400).json({
          success: false,
          error: 'Event, category, and action are required',
        });
      }
      
      const trackedEvent = await AnalyticsService.trackEvent({
        event,
        category,
        action,
        label,
        value,
        user: req.user?._id,
        sessionId: req.sessionID,
        page: req.get('Referer'),
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        metadata,
      });
      
      res.json({
        success: true,
        data: trackedEvent,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};

module.exports = {
  trackPageView,
  trackApiRequest,
  trackUserInteraction,
  analyticsController,
};