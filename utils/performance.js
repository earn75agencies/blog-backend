const cluster = require('cluster');
const os = require('os');
const compression = require('compression');
const express = require('express');

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
    };
    this.startTime = Date.now();
  }

  // Middleware to track request performance
  trackRequest() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.metrics.requests++;
        this.metrics.responseTime.push(duration);
        
        // Keep only last 1000 response times
        if (this.metrics.responseTime.length > 1000) {
          this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
        }
        
        // Log slow requests
        if (duration > 1000) {
          console.warn(`🐌 Slow request: ${req.method} ${req.path} - ${duration}ms`);
        }
      });
      
      next();
    };
  }

  // Track errors
  trackError() {
    return (error, req, res, next) => {
      this.metrics.errors++;
      next(error);
    };
  }

  // Get current metrics
  getMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      uptime: Date.now() - this.startTime,
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
      avgResponseTime: this.metrics.responseTime.length > 0 
        ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
        : 0,
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  // Reset metrics
  reset() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
    };
    this.startTime = Date.now();
  }
}

// Compression optimization
const optimizedCompression = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Don't compress already compressed content
    const contentType = res.getHeader('Content-Type');
    if (contentType && contentType.includes('gzip')) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses larger than 1KB
  chunkSize: 16 * 1024, // 16KB chunks
  windowBits: 15,
  memLevel: 8,
  strategy: compression.constants.Z_DEFAULT_STRATEGY,
});

// Request timeout middleware
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: 'The request took too long to process',
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    next();
  };
};

// Memory usage monitoring
const memoryMonitor = () => {
  const memUsage = process.memoryUsage();
  const used = memUsage.heapUsed / 1024 / 1024;
  const total = memUsage.heapTotal / 1024 / 1024;
  
  if (used > 500) { // Alert if memory usage exceeds 500MB
    console.warn(`⚠️ High memory usage: ${used.toFixed(2)}MB / ${total.toFixed(2)}MB`);
  }
  
  return { used, total };
};

// CPU usage monitoring
const cpuMonitor = () => {
  const startUsage = process.cpuUsage();
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const userCPU = endUsage.user / 1000000; // Convert to seconds
      const systemCPU = endUsage.system / 1000000;
      
      resolve({ user: userCPU, system: systemCPU });
    }, 100);
  });
};

// Cluster management for production
const startCluster = (app, port) => {
  if (cluster.isMaster && process.env.NODE_ENV === 'production') {
    const numCPUs = os.cpus().length;
    console.log(`🚀 Starting ${numCPUs} worker processes...`);
    
    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    
    // Restart workers on exit
    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died. Restarting...`);
      cluster.fork();
    });
    
    // Monitor cluster
    cluster.on('online', (worker) => {
      console.log(`Worker ${worker.process.pid} is online`);
    });
    
  } else {
    // Start server in worker process
    app.listen(port, () => {
      console.log(`Worker ${process.pid} listening on port ${port}`);
    });
  }
};

// Graceful shutdown handler
const gracefulShutdown = (server, dbConnection) => {
  const shutdown = async (signal) => {
    console.log(`\n${signal} received: starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
      console.log('✅ HTTP server closed');
      
      try {
        // Close database connection
        if (dbConnection) {
          await dbConnection.close();
          console.log('✅ Database connection closed');
        }
        
        // Close other resources
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });
    
    // Force shutdown after timeout
    setTimeout(() => {
      console.error('❌ Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
  
  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('uncaughtException');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
};

// Health check endpoint
const healthCheck = (dbConnection, cacheService) => {
  return async (req, res) => {
    try {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: {
          database: 'unknown',
          cache: 'unknown',
          memory: 'unknown',
        },
      };
      
      // Check database
      if (dbConnection && dbConnection.readyState === 1) {
        try {
          await dbConnection.db.admin().ping();
          health.checks.database = 'connected';
        } catch (error) {
          health.checks.database = 'error';
          health.status = 'degraded';
        }
      } else {
        health.checks.database = 'disconnected';
        health.status = 'degraded';
      }
      
      // Check cache
      if (cacheService) {
        try {
          const stats = await cacheService.getStats();
          health.checks.cache = 'connected';
          health.checks.cacheStats = stats;
        } catch (error) {
          health.checks.cache = 'error';
          health.status = 'degraded';
        }
      }
      
      // Check memory
      const memUsage = process.memoryUsage();
      const memUsageMB = memUsage.heapUsed / 1024 / 1024;
      health.checks.memory = memUsageMB > 500 ? 'high' : 'ok';
      health.checks.memoryUsage = {
        used: Math.round(memUsageMB),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
      };
      
      const statusCode = health.status === 'ok' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: 'Health check failed',
        error: error.message,
      });
    }
  };
};

module.exports = {
  PerformanceMonitor,
  optimizedCompression,
  requestTimeout,
  memoryMonitor,
  cpuMonitor,
  startCluster,
  gracefulShutdown,
  healthCheck,
};