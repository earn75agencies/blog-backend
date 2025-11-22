const Post = require('../models/Post.model');
const Tag = require('../models/Tag.model');
const { calculatePagination, getSkip } = require('../utils/pagination.util');

/**
 * Post service layer
 * Contains business logic for posts
 */
class PostService {
  /**
   * Get posts with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Posts and pagination info
   */
  async getPosts(options = {}) {
    const {
      page = 1,
      limit = 10,
      category,
      tags,
      author,
      status = 'published',
      sortBy = 'publishedAt',
      sortOrder = -1,
      search,
    } = options;

    const query = {};
    
    if (status) {
      query.status = status;
      if (status === 'published') {
        query.publishedAt = { $lte: new Date() };
      }
    }

    if (category) query.category = category;
    if (tags && tags.length > 0) query.tags = { $in: tags };
    if (author) query.author = author;
    
    if (search) {
      query.$text = { $search: search };
    }

    const skip = getSkip(page, limit);
    const sort = { [sortBy]: sortOrder };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'username avatar firstName lastName')
        .populate('category', 'name slug')
        .populate('tags', 'name slug')
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .lean(),
      Post.countDocuments(query),
    ]);

    const pagination = calculatePagination(page, limit, total);

    return { posts, pagination };
  }

  /**
   * Get single post by slug
   * @param {string} slug - Post slug
   * @returns {Promise<Object>} Post
   */
  async getPostBySlug(slug) {
    const post = await Post.findOne({ slug })
      .populate('author', 'username avatar firstName lastName bio')
      .populate('category', 'name slug description')
      .populate('tags', 'name slug')
      .lean();

    if (!post) {
      throw new Error('Post not found');
    }

    return post;
  }

  /**
   * Create new post
   * @param {Object} data - Post data
   * @returns {Promise<Object>} Created post
   */
  async createPost(data) {
    const post = await Post.create(data);
    return post;
  }

  /**
   * Update post
   * @param {string} id - Post ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated post
   */
  async updatePost(id, data) {
    const post = await Post.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    })
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .lean();

    if (!post) {
      throw new Error('Post not found');
    }

    return post;
  }

  /**
   * Delete post
   * @param {string} id - Post ID
   * @returns {Promise<void>}
   */
  async deletePost(id) {
    const post = await Post.findByIdAndDelete(id);
    if (!post) {
      throw new Error('Post not found');
    }
  }

  /**
   * Increment post views
   * @param {string} id - Post ID
   * @returns {Promise<void>}
   */
  async incrementViews(id) {
    await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });
  }

  /**
   * Toggle like on post
   * @param {string} id - Post ID
   * @param {string} userId - User ID
   * @returns {Promise<number>} Updated likes count
   */
  async toggleLike(id, userId) {
    const post = await Post.findById(id);
    if (!post) {
      throw new Error('Post not found');
    }

    const index = post.likes.indexOf(userId);
    if (index > -1) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    return post.likes.length;
  }

  /**
   * Get featured posts
   * @param {number} limit - Number of posts
   * @returns {Promise<Array>} Featured posts
   */
  async getFeaturedPosts(limit = 5) {
    return Post.find({
      status: 'published',
      isFeatured: true,
      publishedAt: { $lte: new Date() },
    })
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get related posts
   * @param {string} postId - Post ID
   * @param {number} limit - Number of posts
   * @returns {Promise<Array>} Related posts
   */
  async getRelatedPosts(postId, limit = 5) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    return Post.find({
      $or: [{ category: post.category }, { tags: { $in: post.tags } }],
      _id: { $ne: postId },
      status: 'published',
      publishedAt: { $lte: new Date() },
    })
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .limit(limit)
      .sort({ publishedAt: -1 })
      .lean();
  }

  /**
   * Search posts
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchPosts(query, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = getSkip(page, limit);

    const posts = await Post.find(
      {
        $text: { $search: query },
        status: 'published',
        publishedAt: { $lte: new Date() },
      },
      { score: { $meta: 'textScore' } }
    )
      .populate('author', 'username avatar firstName lastName')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Post.countDocuments({
      $text: { $search: query },
      status: 'published',
      publishedAt: { $lte: new Date() },
    });

    const pagination = calculatePagination(page, limit, total);

    return { posts, pagination };
  }
}

module.exports = new PostService();

