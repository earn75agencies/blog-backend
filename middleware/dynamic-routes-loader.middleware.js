/**
 * Dynamic Routes Loader Middleware
 * Enables feature flags and dynamic route registration
 * Eliminates the need to edit server.js when adding new routes
 */

const fs = require('fs');
const path = require('path');

/**
 * Load routes dynamically from routes directory
 * Supports feature flags via environment variables
 * Convention: ENABLE_FEATURE_NAME environment variable
 */
const loadRoutesWithFeatureFlags = (app, featuresConfig = {}) => {
  const routesDir = path.join(__dirname, '../routes');
  
  // Default features configuration
  const defaultFeatures = {
    auth: true,
    posts: true,
    comments: true,
    users: true,
    categories: true,
    tags: true,
    analytics: true,
    notifications: true,
    bookmarks: true,
    admin: true,
    seo: true,
    feed: true,
    newsletter: true,
    payment: process.env.ENABLE_PAYMENTS === 'true',
    events: process.env.ENABLE_EVENTS === 'true',
    series: process.env.ENABLE_SERIES === 'true',
    courses: process.env.ENABLE_COURSES === 'true',
    media: process.env.ENABLE_MEDIA === 'true',
    hashtags: process.env.ENABLE_HASHTAGS === 'true',
    products: process.env.ENABLE_PRODUCTS === 'true',
    ai: process.env.ENABLE_AI === 'true',
    advancedAi: process.env.ENABLE_ADVANCED_AI === 'true',
    groups: process.env.ENABLE_GROUPS === 'true',
    socialAuth: process.env.ENABLE_SOCIAL_AUTH === 'true',
    magicLink: process.env.ENABLE_MAGIC_LINK === 'true',
    postVersions: process.env.ENABLE_POST_VERSIONS === 'true',
    accessibility: process.env.ENABLE_ACCESSIBILITY === 'true',
    textToSpeech: process.env.ENABLE_TEXT_TO_SPEECH === 'true',
    contentLicense: process.env.ENABLE_CONTENT_LICENSE === 'true',
    paidContent: process.env.ENABLE_PAID_CONTENT === 'true',
    communityVote: process.env.ENABLE_COMMUNITY_VOTE === 'true',
    scheduledPosts: process.env.ENABLE_SCHEDULED_POSTS === 'true',
    webhooks: process.env.ENABLE_WEBHOOKS === 'true',
    publicApi: process.env.ENABLE_PUBLIC_API === 'true',
    reports: process.env.ENABLE_REPORTS === 'true',
    dataManagement: process.env.ENABLE_DATA_MANAGEMENT === 'true',
    dataExport: process.env.ENABLE_DATA_EXPORT === 'true',
    mobileSync: process.env.ENABLE_MOBILE_SYNC === 'true',
    ...featuresConfig,
  };

  // Route-to-feature mapping
  const routeFeatureMap = {
    'auth.routes': 'auth',
    'user.routes': 'users',
    'post.routes': 'posts',
    'comment.routes': 'comments',
    'category.routes': 'categories',
    'tag.routes': 'tags',
    'analytics.routes': 'analytics',
    'notification.routes': 'notifications',
    'bookmark.routes': 'bookmarks',
    'admin.routes': 'admin',
    'seo.routes': 'seo',
    'feed.routes': 'feed',
    'newsletter.routes': 'newsletter',
    'payment.routes': 'payment',
    'event.routes': 'events',
    'event-webinar.routes': 'events',
    'series.routes': 'series',
    'course.routes': 'courses',
    'media.routes': 'media',
    'media-library.routes': 'media',
    'hashtag.routes': 'hashtags',
    'hashtag-mention.routes': 'hashtags',
    'product.routes': 'products',
    'product-ecommerce.routes': 'products',
    'ai.routes': 'ai',
    'advanced-ai.routes': 'advancedAi',
    'group.routes': 'groups',
    'social-auth.routes': 'socialAuth',
    'magic-link.routes': 'magicLink',
    'post-version.routes': 'postVersions',
    'accessibility.routes': 'accessibility',
    'text-to-speech.routes': 'textToSpeech',
    'content-license.routes': 'contentLicense',
    'paid-content.routes': 'paidContent',
    'community-vote.routes': 'communityVote',
    'scheduled-post.routes': 'scheduledPosts',
    'webhook.routes': 'webhooks',
    'public-api.routes': 'publicApi',
    'report.routes': 'reports',
    'data-management.routes': 'dataManagement',
    'data-export.routes': 'dataExport',
    'mobile-sync.routes': 'mobileSync',
  };

  // API base path
  const apiBasePath = '/api';

  // Load and register routes
  const loadedRoutes = [];
  const skippedRoutes = [];

  try {
    const files = fs.readdirSync(routesDir);

    files.forEach((file) => {
      if (!file.endsWith('.routes.js')) return;

      const routeName = file.replace('.routes.js', '');
      const featureName = routeFeatureMap[file] || routeName;

      // Check if feature is enabled
      if (!defaultFeatures[featureName]) {
        skippedRoutes.push({ file, reason: `Feature '${featureName}' disabled` });
        return;
      }

      try {
        const routePath = path.join(routesDir, file);
        const router = require(routePath);

        // Convert route name to URL path
        const urlPath = `${apiBasePath}/${routeName.replace(/\./g, '/')}`;

        app.use(urlPath, router);
        loadedRoutes.push({ file, path: urlPath, feature: featureName });
      } catch (error) {
        skippedRoutes.push({ file, reason: `Error: ${error.message}` });
      }
    });
  } catch (error) {
    console.error('❌ Error loading routes dynamically:', error.message);
    throw error;
  }

  return { loadedRoutes, skippedRoutes, featuresEnabled: defaultFeatures };
};

/**
 * Log route loading summary
 */
const logRouteLoadingSummary = (loadedRoutes, skippedRoutes) => {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 DYNAMIC ROUTE LOADING SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n✅ Loaded Routes (${loadedRoutes.length}):`);
  loadedRoutes.slice(0, 5).forEach((route) => {
    console.log(`   ${route.path.padEnd(40)} [${route.feature}]`);
  });

  if (loadedRoutes.length > 5) {
    console.log(`   ... and ${loadedRoutes.length - 5} more`);
  }

  if (skippedRoutes.length > 0) {
    console.log(`\n⏭️  Skipped Routes (${skippedRoutes.length}):`);
    skippedRoutes.slice(0, 3).forEach((route) => {
      console.log(`   ${route.file.padEnd(40)} ${route.reason}`);
    });

    if (skippedRoutes.length > 3) {
      console.log(`   ... and ${skippedRoutes.length - 3} more`);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
};

module.exports = {
  loadRoutesWithFeatureFlags,
  logRouteLoadingSummary,
};
