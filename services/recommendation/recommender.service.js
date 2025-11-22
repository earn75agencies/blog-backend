/**
 * Recommendation Service
 * Generates personalized recommendations for users
 * Uses in-memory cache (node-cache) for caching recommendations
 */

const Post = require('../../models/Post.model');
const User = require('../../models/User.model');
const CacheUtil = require('../../utils/cache.util');
const { addJob } = require('../queue/queue.service');

class RecommenderService {
  /**
   * Get personalized recommendations for user
   */
  async getRecommendations(userId, options = {}) {
    const {
      limit = 20,
      categories = [],
      excludePosts = [],
    } = options;

    // Check cache first
    const cacheKey = `recommendations:${userId}`;
    const cached = CacheUtil.get(cacheKey);
    
    if (cached) {
      return {
        posts: cached.slice(0, limit),
        source: 'cache',
      };
    }

    // Generate recommendations
    const recommendations = await this.generateRecommendations(userId, {
      limit: limit * 2, // Generate more for filtering
      categories,
      excludePosts,
    });

    // Cache for 1 hour
    CacheUtil.set(cacheKey, recommendations, 3600);

    return {
      posts: recommendations.slice(0, limit),
      source: 'generated',
    };
  }

  /**
   * Generate recommendations based on user behavior
   */
  async generateRecommendations(userId, options = {}) {
    const {
      limit = 20,
      categories = [],
      excludePosts = [],
    } = options;

    try {
      const user = await User.findById(userId).lean();
      if (!user) {
        return [];
      }

      // Get user's liked posts
      const likedPosts = await Post.find({
        _id: { $in: user.favoritePosts || [] },
        status: 'published',
      })
        .select('category tags')
        .lean();

      // Extract preferred categories and tags
      const preferredCategories = new Set();
      const preferredTags = new Set();

      likedPosts.forEach(post => {
        if (post.category) {
          preferredCategories.add(post.category.toString());
        }
        if (post.tags) {
          post.tags.forEach(tag => preferredTags.add(tag.toString()));
        }
      });

      // Build recommendation query
      const query = {
        status: 'published',
        publishedAt: { $lte: new Date() },
        _id: { $nin: excludePosts },
        author: { $ne: userId }, // Don't recommend own posts
      };

      // Filter by preferred categories if available
      if (preferredCategories.size > 0 && categories.length === 0) {
        query.category = { $in: Array.from(preferredCategories) };
      } else if (categories.length > 0) {
        query.category = { $in: categories };
      }

      // Boost posts with preferred tags
      let posts;
      if (preferredTags.size > 0) {
        // Get posts with preferred tags (higher priority)
        const tagPosts = await Post.find({
          ...query,
          tags: { $in: Array.from(preferredTags) },
        })
          .sort({ rankingScore: -1, publishedAt: -1 })
          .limit(limit)
          .lean();

        // Get other trending posts
        const trendingPosts = await Post.find({
          ...query,
          tags: { $nin: Array.from(preferredTags) },
        })
          .sort({ rankingScore: -1, publishedAt: -1 })
          .limit(Math.floor(limit / 2))
          .lean();

        posts = [...tagPosts, ...trendingPosts].slice(0, limit);
      } else {
        // No preferences, return trending posts
        posts = await Post.find(query)
          .sort({ rankingScore: -1, publishedAt: -1 })
          .limit(limit)
          .lean();
      }

      // Populate fields
      await Post.populate(posts, [
        { path: 'author', select: 'username avatar firstName lastName' },
        { path: 'category', select: 'name slug' },
        { path: 'tags', select: 'name slug' },
      ]);

      return posts;
    } catch (error) {
      console.error('Recommendation generation error:', error);
      return [];
    }
  }

  /**
   * Update recommendations for user (background job)
   */
  async updateRecommendations(userId) {
    try {
      const recommendations = await this.generateRecommendations(userId, { limit: 50 });
      const cacheKey = `recommendations:${userId}`;
      CacheUtil.set(cacheKey, recommendations, 3600);
      return { success: true, count: recommendations.length };
    } catch (error) {
      console.error('Update recommendations error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trending posts (global)
   */
  async getTrendingPosts(limit = 20) {
    const cacheKey = 'trending:posts';
    const cached = CacheUtil.get(cacheKey);
    
    if (cached) {
      return cached.slice(0, limit);
    }

    // Generate trending posts
    const posts = await Post.find({
      status: 'published',
      publishedAt: { $lte: new Date() },
    })
      .sort({ rankingScore: -1, publishedAt: -1 })
      .limit(limit)
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .lean();

    // Cache for 10 minutes
    CacheUtil.set(cacheKey, posts, 600);

    return posts;
  }

  /**
   * Get similar posts
   */
  async getSimilarPosts(postId, limit = 10) {
    try {
      const post = await Post.findById(postId).lean();
      if (!post) {
        return [];
      }

      const query = {
        status: 'published',
        publishedAt: { $lte: new Date() },
        _id: { $ne: postId },
      };

      // Find posts in same category
      if (post.category) {
        query.category = post.category;
      }

      // Find posts with similar tags
      if (post.tags && post.tags.length > 0) {
        query.tags = { $in: post.tags };
      }

      const similarPosts = await Post.find(query)
        .sort({ rankingScore: -1, publishedAt: -1 })
        .limit(limit)
        .populate('author', 'username avatar firstName lastName')
        .populate('category', 'name slug')
        .populate('tags', 'name slug')
        .lean();

      return similarPosts;
    } catch (error) {
      console.error('Similar posts error:', error);
      return [];
    }
  }

  /**
   * Queue recommendation update job
   */
  async queueRecommendationUpdate(userId) {
    await addJob('recommendations', {
      userId: userId.toString(),
      action: 'update',
    });
  }
}

module.exports = new RecommenderService();



