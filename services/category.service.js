const Category = require('../models/Category.model');
const Post = require('../models/Post.model');
const { calculatePagination, getSkip } = require('../utils/pagination.util');

/**
 * Category service layer
 * Contains business logic for categories
 */
class CategoryService {
  /**
   * Get all active categories
   * @returns {Promise<Array>} Categories
   */
  async getAllCategories() {
    return Category.find({ isActive: true })
      .populate('postsCount')
      .sort({ order: 1, name: 1 })
      .lean();
  }

  /**
   * Get category by slug
   * @param {string} slug - Category slug
   * @returns {Promise<Object>} Category
   */
  async getCategoryBySlug(slug) {
    const category = await Category.findOne({ slug })
      .populate('postsCount')
      .lean();

    if (!category || !category.isActive) {
      throw new Error('Category not found');
    }

    return category;
  }

  /**
   * Create category
   * @param {Object} data - Category data
   * @returns {Promise<Object>} Created category
   */
  async createCategory(data) {
    const category = await Category.create(data);
    return category;
  }

  /**
   * Update category
   * @param {string} id - Category ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated category
   */
  async updateCategory(id, data) {
    const category = await Category.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  /**
   * Delete category
   * @param {string} id - Category ID
   * @returns {Promise<void>}
   */
  async deleteCategory(id) {
    // Check if category has posts
    const postsCount = await Post.countDocuments({ category: id });
    if (postsCount > 0) {
      throw new Error('Cannot delete category with existing posts');
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      throw new Error('Category not found');
    }
  }

  /**
   * Get category posts
   * @param {string} categoryId - Category ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Posts and pagination
   */
  async getCategoryPosts(categoryId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({
        category: categoryId,
        status: 'published',
        publishedAt: { $lte: new Date() },
      })
        .populate('author', 'username avatar firstName lastName')
        .populate('category', 'name slug')
        .populate('tags', 'name slug')
        .skip(skip)
        .limit(limit)
        .sort({ publishedAt: -1 })
        .lean(),
      Post.countDocuments({
        category: categoryId,
        status: 'published',
        publishedAt: { $lte: new Date() },
      }),
    ]);

    const pagination = calculatePagination(page, limit, total);

    return { posts, pagination };
  }
}

module.exports = new CategoryService();

