const User = require('../models/User.model');
const Post = require('../models/Post.model');
const { calculatePagination, getSkip } = require('../utils/pagination.util');

/**
 * User service layer
 * Contains business logic for users
 */
class UserService {
  /**
   * Get users with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Users and pagination info
   */
  async getUsers(options = {}) {
    const { page = 1, limit = 10, search } = options;

    const query = { isActive: true };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = getSkip(page, limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments(query),
    ]);

    const pagination = calculatePagination(page, limit, total);

    return { users, pagination };
  }

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object>} User
   */
  async getUserById(id) {
    const user = await User.findById(id)
      .select('-password')
      .populate('postsCount')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Get user by username
   * @param {string} username - Username
   * @returns {Promise<Object>} User
   */
  async getUserByUsername(username) {
    const user = await User.findOne({ username })
      .select('-password')
      .populate('postsCount')
      .populate({
        path: 'followers',
        select: 'username avatar',
        limit: 10,
      })
      .populate({
        path: 'following',
        select: 'username avatar',
        limit: 10,
      })
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(id, data) {
    const user = await User.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    })
      .select('-password')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Follow user
   * @param {string} userId - User ID to follow
   * @param {string} followerId - Follower ID
   * @returns {Promise<void>}
   */
  async followUser(userId, followerId) {
    if (userId === followerId) {
      throw new Error('Cannot follow yourself');
    }

    const [user, follower] = await Promise.all([
      User.findById(userId),
      User.findById(followerId),
    ]);

    if (!user || !follower) {
      throw new Error('User not found');
    }

    if (follower.following.includes(userId)) {
      throw new Error('Already following this user');
    }

    follower.following.push(userId);
    user.followers.push(followerId);

    await Promise.all([follower.save(), user.save()]);
  }

  /**
   * Unfollow user
   * @param {string} userId - User ID to unfollow
   * @param {string} followerId - Follower ID
   * @returns {Promise<void>}
   */
  async unfollowUser(userId, followerId) {
    const [user, follower] = await Promise.all([
      User.findById(userId),
      User.findById(followerId),
    ]);

    if (!user || !follower) {
      throw new Error('User not found');
    }

    if (!follower.following.includes(userId)) {
      throw new Error('Not following this user');
    }

    follower.following.pull(userId);
    user.followers.pull(followerId);

    await Promise.all([follower.save(), user.save()]);
  }

  /**
   * Get user statistics
   * @param {string} id - User ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(id) {
    const [user, posts] = await Promise.all([
      User.findById(id).select('-password').lean(),
      Post.find({ author: id }).lean(),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    const stats = {
      totalPosts: posts.length,
      publishedPosts: posts.filter((p) => p.status === 'published').length,
      draftPosts: posts.filter((p) => p.status === 'draft').length,
      totalViews: posts.reduce((sum, p) => sum + p.views, 0),
      totalLikes: posts.reduce((sum, p) => sum + p.likes.length, 0),
      totalComments: posts.reduce((sum, p) => sum + p.commentsCount, 0),
      followers: user.followers?.length || 0,
      following: user.following?.length || 0,
    };

    return stats;
  }
}

module.exports = new UserService();

