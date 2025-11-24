const mongoose = require('mongoose');
const { Schema } = mongoose;

// Database optimization configurations
const dbConfig = {
  // Connection pool settings
  maxPoolSize: parseInt(process.env.DB_CONNECTION_POOL_SIZE) || 20,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
  bufferCommands: false,
  bufferMaxEntries: 0,
};

// Optimized connection options
const optimizedOptions = {
  ...dbConfig,
  // Read preferences
  readPreference: 'primaryPreferred',
  // Write concerns
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 10000,
  },
  // Read concerns
  readConcern: {
    level: 'majority',
  },
  // Retry settings
  retryWrites: true,
  retryReads: true,
};

// Index definitions for performance
const createIndexes = async () => {
  try {
    console.log('🔍 Creating database indexes...');

    // Posts collection indexes
    await mongoose.connection.db.collection('posts').createIndexes([
      { key: { title: 'text', content: 'text' }, name: 'posts_text_search' },
      { key: { author: 1, publishedAt: -1 }, name: 'posts_author_date' },
      { key: { category: 1, publishedAt: -1 }, name: 'posts_category_date' },
      { key: { tags: 1 }, name: 'posts_tags' },
      { key: { featured: 1, publishedAt: -1 }, name: 'posts_featured_date' },
      { key: { status: 1, publishedAt: -1 }, name: 'posts_status_date' },
      { key: { slug: 1 }, name: 'posts_slug', unique: true },
      { key: { publishedAt: -1 }, name: 'posts_published_at' },
      { key: { likes: -1 }, name: 'posts_likes' },
      { key: { views: -1 }, name: 'posts_views' },
    ]);

    // Users collection indexes
    await mongoose.connection.db.collection('users').createIndexes([
      { key: { email: 1 }, name: 'users_email', unique: true },
      { key: { username: 1 }, name: 'users_username', unique: true },
      { key: { role: 1 }, name: 'users_role' },
      { key: { isActive: 1 }, name: 'users_active' },
      { key: { createdAt: -1 }, name: 'users_created_at' },
    ]);

    // Comments collection indexes
    await mongoose.connection.db.collection('comments').createIndexes([
      { key: { post: 1, createdAt: -1 }, name: 'comments_post_date' },
      { key: { author: 1, createdAt: -1 }, name: 'comments_author_date' },
      { key: { parentComment: 1 }, name: 'comments_parent' },
      { key: { isApproved: 1 }, name: 'comments_approved' },
    ]);

    // Categories collection indexes
    await mongoose.connection.db.collection('categories').createIndexes([
      { key: { slug: 1 }, name: 'categories_slug', unique: true },
      { key: { parent: 1 }, name: 'categories_parent' },
      { key: { isActive: 1 }, name: 'categories_active' },
    ]);

    // Tags collection indexes
    await mongoose.connection.db.collection('tags').createIndexes([
      { key: { name: 1 }, name: 'tags_name', unique: true },
      { key: { slug: 1 }, name: 'tags_slug', unique: true },
      { key: { count: -1 }, name: 'tags_count' },
    ]);

    // Notifications collection indexes
    await mongoose.connection.db.collection('notifications').createIndexes([
      { key: { recipient: 1, createdAt: -1 }, name: 'notifications_recipient_date' },
      { key: { isRead: 1 }, name: 'notifications_read' },
      { key: { type: 1 }, name: 'notifications_type' },
    ]);

    // Analytics collection indexes
    await mongoose.connection.db.collection('analyticsevents').createIndexes([
      { key: { event: 1, timestamp: -1 }, name: 'analytics_event_time' },
      { key: { userId: 1, timestamp: -1 }, name: 'analytics_user_time' },
      { key: { postId: 1, timestamp: -1 }, name: 'analytics_post_time' },
      { key: { timestamp: -1 }, name: 'analytics_timestamp' },
    ]);

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

// Database connection with optimizations
const connectOptimizedDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || process.env.MONGODB_URI_PROD,
      optimizedOptions
    );

    console.log('✅ MongoDB connected with optimized settings');
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Pool Size: ${dbConfig.maxPoolSize}`);

    // Create indexes after connection
    await createIndexes();

    // Set up connection monitoring
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Query optimization middleware
const optimizeQuery = (schema) => {
  // Add lean() for read-only queries
  schema.pre(['find', 'findOne'], function() {
    if (!this.options.skipLean) {
      this.lean();
    }
  });

  // Add select optimization
  schema.pre(['find', 'findOne'], function() {
    if (!this.options.select) {
      // Only select necessary fields by default
      this.select('-__v');
    }
  });

  // Add limit for large collections
  schema.pre('find', function() {
    if (!this.getQuery().limit && !this.options.skipLimit) {
      this.limit(100); // Default limit to prevent large result sets
    }
  });
};

// Performance monitoring for queries
const monitorQueryPerformance = () => {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    const start = Date.now();
    
    return (...args) => {
      const duration = Date.now() - start;
      
      if (duration > 100) { // Log slow queries (>100ms)
        console.warn(`🐌 Slow Query (${duration}ms): ${collectionName}.${method}`, {
          query,
          collection: collectionName,
          method,
          duration,
        });
      }
    };
  });
};

// Database health check
const checkDatabaseHealth = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    const result = await admin.ping();
    
    if (result.ok === 1) {
      const stats = await mongoose.connection.db.stats();
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      return {
        status: 'healthy',
        ping: result,
        stats: {
          collections: collections.length,
          dataSize: stats.dataSize,
          indexSize: stats.indexSize,
          storageSize: stats.storageSize,
        },
        collections: collections.map(c => c.name),
      };
    } else {
      return { status: 'unhealthy', ping: result };
    }
  } catch (error) {
    return { status: 'error', error: error.message };
  }
};

// Cleanup old data
const cleanupOldData = async () => {
  try {
    console.log('🧹 Starting database cleanup...');
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Clean old analytics events
    const analyticsResult = await mongoose.connection.db
      .collection('analyticsevents')
      .deleteMany({ timestamp: { $lt: thirtyDaysAgo } });
    
    // Clean old notifications (older than 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const notificationsResult = await mongoose.connection.db
      .collection('notifications')
      .deleteMany({ 
        createdAt: { $lt: ninetyDaysAgo },
        isRead: true 
      });
    
    console.log('✅ Database cleanup completed:', {
      analyticsDeleted: analyticsResult.deletedCount,
      notificationsDeleted: notificationsResult.deletedCount,
    });
    
    return {
      analyticsDeleted: analyticsResult.deletedCount,
      notificationsDeleted: notificationsResult.deletedCount,
    };
  } catch (error) {
    console.error('❌ Database cleanup error:', error);
    return null;
  }
};

module.exports = {
  connectOptimizedDB,
  optimizeQuery,
  monitorQueryPerformance,
  checkDatabaseHealth,
  cleanupOldData,
  dbConfig,
};