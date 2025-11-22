const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import admin initialization service
const { initializeAdmins } = require('./services/admin-init.service');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const postRoutes = require('./routes/post.routes');
const commentRoutes = require('./routes/comment.routes');
const categoryRoutes = require('./routes/category.routes');
const tagRoutes = require('./routes/tag.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const seoRoutes = require('./routes/seo.routes');
const viewRoutes = require('./routes/view.routes');
const bookmarkRoutes = require('./routes/bookmark.routes');
const paymentRoutes = require('./routes/payment.routes');
const eventRoutes = require('./routes/event.routes');
const configRoutes = require('./routes/config.routes');
const seriesRoutes = require('./routes/series.routes');
const courseRoutes = require('./routes/course.routes');
const mediaRoutes = require('./routes/media.routes');
const hashtagRoutes = require('./routes/hashtag.routes');
const productRoutes = require('./routes/product.routes');
const aiRoutes = require('./routes/ai.routes');
const groupRoutes = require('./routes/group.routes');
const advancedAiRoutes = require('./routes/advanced-ai.routes');
const websocketService = require('./services/realtime/websocket.service');
const publicApiRoutes = require('./routes/public-api.routes');
const webhookRoutes = require('./routes/webhook.routes');
const socialAuthRoutes = require('./routes/social-auth.routes');
const magicLinkRoutes = require('./routes/magic-link.routes');
const postVersionRoutes = require('./routes/post-version.routes');
const accessibilityRoutes = require('./routes/accessibility.routes');
const textToSpeechRoutes = require('./routes/text-to-speech.routes');
const contentLicenseRoutes = require('./routes/content-license.routes');
const paidContentRoutes = require('./routes/paid-content.routes');
const communityVoteRoutes = require('./routes/community-vote.routes');
const scheduledPostRoutes = require('./routes/scheduled-post.routes');
const vrContentRoutes = require('./routes/vr-content.routes');
const gamificationRoutes = require('./routes/gamification.routes');
const monetizationRoutes = require('./routes/monetization.routes');
const eventWebinarRoutes = require('./routes/event-webinar.routes');
const hashtagMentionRoutes = require('./routes/hashtag-mention.routes');
const workflowApprovalRoutes = require('./routes/workflow-approval.routes');
const analyticsReportingRoutes = require('./routes/analytics-reporting.routes');
const notificationMessagingRoutes = require('./routes/notification-messaging.routes');
const productEcommerceRoutes = require('./routes/product-ecommerce.routes');
const seriesCourseRoutes = require('./routes/series-course.routes');
const mediaLibraryRoutes = require('./routes/media-library.routes');
const mobileSyncRoutes = require('./routes/mobile-sync.routes');
const developerEcosystemRoutes = require('./routes/developer-ecosystem.routes');
const viralityNetworkRoutes = require('./routes/virality-network.routes');
const seoOptimizationRoutes = require('./routes/seo-optimization.routes');
const searchDiscoveryRoutes = require('./routes/search-discovery.routes');
const podcastAudioRoutes = require('./routes/podcast-audio.routes');
const workspaceCollaborationRoutes = require('./routes/workspace-collaboration.routes');
const infrastructureCloudRoutes = require('./routes/infrastructure-cloud.routes');
const internationalizationRoutes = require('./routes/internationalization.routes');
const personalizationRoutes = require('./routes/personalization.routes');
const dataManagementRoutes = require('./routes/data-management.routes');
const customDashboardRoutes = require('./routes/custom-dashboard.routes');
const contactRoutes = require('./routes/contact.routes');
const feedRoutes = require('./routes/feed.routes');
const newsletterRoutes = require('./routes/newsletter.routes');
const reportRoutes = require('./routes/report.routes');
const recommendationRoutes = require('./routes/recommendation.routes');
const noteRoutes = require('./routes/note.routes');

// Import error handler
const errorHandler = require('./middleware/errorHandler.middleware');

// Initialize Express app
const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for blog content
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
}));

// Enhanced compression middleware
app.use(compression({
  level: 6, // Compression level (1-9, 6 is a good balance)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all other requests
    return compression.filter(req, res);
  },
}));

// Rate limiting - General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // or allow requests from frontend URL
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitization middleware (apply before routes)
const sanitizeMiddleware = require('./middleware/sanitize.middleware');
app.use(sanitizeMiddleware);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request ID middleware (add unique ID to each request)
const requestIdMiddleware = require('./middleware/requestId.middleware');
app.use(requestIdMiddleware);

// Request logger middleware
const requestLogger = require('./middleware/requestLogger.middleware');
app.use(requestLogger);

// Request timeout middleware
const requestTimeout = require('./middleware/requestTimeout.middleware');
app.use(requestTimeout(30000)); // 30 second timeout

// Performance monitoring middleware
const { performanceMonitor, responseTimeHeader } = require('./middleware/performance.middleware');
app.use(performanceMonitor(1000)); // Log requests slower than 1 second
app.use(responseTimeHeader);

// MongoDB connection with improved configuration
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  bufferCommands: false, // Disable mongoose buffering
  // Note: bufferMaxEntries is deprecated and removed in newer MongoDB drivers
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gidi-blog', mongooseOptions)
.then(async () => {
  console.log('✅ MongoDB connected successfully');
  console.log(`   Database: ${mongoose.connection.name}`);
  console.log(`   Host: ${mongoose.connection.host}`);
  
  // Initialize default admin accounts after successful DB connection
  try {
    await initializeAdmins();
  } catch (error) {
    console.error('⚠️  Error initializing admins:', error.message);
    // Don't exit, continue server startup
  }
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  // Retry connection after 5 seconds
  setTimeout(() => {
    console.log('🔄 Retrying MongoDB connection...');
    mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_URI_PROD, mongooseOptions)
      .catch((retryErr) => {
        console.error('❌ MongoDB retry failed:', retryErr.message);
        process.exit(1);
      });
  }, 5000);
});

// MongoDB connection event handlers
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'unknown',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        limit: Math.round(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024),
      },
    },
  };

  // Check MongoDB connection
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      healthCheck.checks.database = 'connected';
    } else {
      healthCheck.checks.database = 'disconnected';
      healthCheck.status = 'degraded';
    }
  } catch (error) {
    healthCheck.checks.database = 'error';
    healthCheck.status = 'degraded';
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// API configuration endpoint (must be before other API routes)
app.use('/api/config', configRoutes);
app.use('/api/contact', contactRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/feeds', feedRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/views', viewRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/hashtags', hashtagRoutes);
app.use('/api/products', productRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/ai/advanced', advancedAiRoutes);
app.use('/api/public', publicApiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/auth/social', socialAuthRoutes);
app.use('/api/auth/magic-link', magicLinkRoutes);
app.use('/api/posts', postVersionRoutes);
app.use('/api', accessibilityRoutes);
app.use('/api', textToSpeechRoutes);
app.use('/api', contentLicenseRoutes);
app.use('/api', paidContentRoutes);
app.use('/api/communities', communityVoteRoutes);
app.use('/api/posts', scheduledPostRoutes);
app.use('/api/vr-content', vrContentRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/monetization', monetizationRoutes);
app.use('/api', eventWebinarRoutes);
app.use('/api/hashtags', hashtagMentionRoutes);
app.use('/api/workflows', workflowApprovalRoutes);
app.use('/api/analytics', analyticsReportingRoutes);
app.use('/api', notificationMessagingRoutes);
app.use('/api/products', productEcommerceRoutes);
app.use('/api', seriesCourseRoutes);
app.use('/api/media', mediaLibraryRoutes);
app.use('/api/mobile', mobileSyncRoutes);
app.use('/api/developers', developerEcosystemRoutes);
app.use('/api/virality', viralityNetworkRoutes);
app.use('/api/seo', seoOptimizationRoutes);
app.use('/api/search', searchDiscoveryRoutes);
app.use('/api/podcasts', podcastAudioRoutes);
app.use('/api/workspaces', workspaceCollaborationRoutes);
app.use('/api/infrastructure', infrastructureCloudRoutes);
app.use('/api/i18n', internationalizationRoutes);
app.use('/api/personalization', personalizationRoutes);
app.use('/api/data', dataManagementRoutes);
app.use('/api/dashboards', customDashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

// Handle port already in use error
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`   API URL: http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/health`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`   Run: node scripts/kill-port.js ${PORT}`);
    console.error(`   Or use a different port: PORT=5001 npm run dev`);
    process.exit(1);
  } else {
    console.error(`❌ Server error: ${err.message}`);
    process.exit(1);
  }
});

// Initialize WebSocket server
websocketService.initialize(server);
console.log('WebSocket server initialized');


// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} signal received: starting graceful shutdown...`);
  
  // Stop accepting new requests
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      // Close MongoDB connection
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
      }
      
      // Close queue connections (if using Redis-based queues)
      try {
        const queueService = require('./services/queue/queue.service');
        if (queueService && typeof queueService.closeAll === 'function') {
          await queueService.closeAll();
          console.log('✅ Queue connections closed');
        }
      } catch (err) {
        // Queue service may not be available or may not use Redis
        console.warn('⚠️  Queue close skipped:', err.message);
      }
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  });  
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
}); 

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't exit - let the application continue
});

// Remove duplicate SIGTERM handler - gracefulShutdown handles it

module.exports = app;

