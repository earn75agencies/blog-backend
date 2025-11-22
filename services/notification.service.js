const Notification = require('../models/Notification.model');
const CacheUtil = require('../utils/cache.util');

/**
 * Notification service
 * Handles notification creation and management
 */
class NotificationService {
  /**
   * Create notification
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(data) {
    const notification = await Notification.create(data);
    
    // Invalidate unread count cache for the user
    if (data.user) {
      CacheUtil.del(`notifications:unread-count:${data.user}`);
    }
    
    return notification;
  }

  /**
   * Create post like notification
   * @param {string} postId - Post ID
   * @param {string} userId - User who liked
   * @param {string} postAuthorId - Post author ID
   * @returns {Promise<Object>} Created notification
   */
  async createPostLikeNotification(postId, userId, postAuthorId) {
    if (userId === postAuthorId) return null; // Don't notify self

    return this.createNotification({
      user: postAuthorId,
      type: 'post_like',
      title: 'New Like',
      message: 'Someone liked your post',
      link: `/post/${postId}`,
      relatedUser: userId,
      relatedPost: postId,
    });
  }

  /**
   * Create comment notification
   * @param {string} postId - Post ID
   * @param {string} commentId - Comment ID
   * @param {string} userId - Comment author ID
   * @param {string} postAuthorId - Post author ID
   * @returns {Promise<Object>} Created notification
   */
  async createCommentNotification(postId, commentId, userId, postAuthorId) {
    if (userId === postAuthorId) return null; // Don't notify self

    return this.createNotification({
      user: postAuthorId,
      type: 'post_comment',
      title: 'New Comment',
      message: 'Someone commented on your post',
      link: `/post/${postId}#comment-${commentId}`,
      relatedUser: userId,
      relatedPost: postId,
      relatedComment: commentId,
    });
  }

  /**
   * Create comment reply notification
   * @param {string} postId - Post ID
   * @param {string} commentId - Comment ID
   * @param {string} userId - Reply author ID
   * @param {string} parentCommentAuthorId - Parent comment author ID
   * @returns {Promise<Object>} Created notification
   */
  async createCommentReplyNotification(
    postId,
    commentId,
    userId,
    parentCommentAuthorId
  ) {
    if (userId === parentCommentAuthorId) return null; // Don't notify self

    return this.createNotification({
      user: parentCommentAuthorId,
      type: 'comment_reply',
      title: 'New Reply',
      message: 'Someone replied to your comment',
      link: `/post/${postId}#comment-${commentId}`,
      relatedUser: userId,
      relatedPost: postId,
      relatedComment: commentId,
    });
  }

  /**
   * Create follow notification
   * @param {string} userId - User who followed
   * @param {string} followedUserId - User being followed
   * @returns {Promise<Object>} Created notification
   */
  async createFollowNotification(userId, followedUserId) {
    if (userId === followedUserId) return null; // Don't notify self

    return this.createNotification({
      user: followedUserId,
      type: 'user_follow',
      title: 'New Follower',
      message: 'Someone started following you',
      link: `/author/${userId}`,
      relatedUser: userId,
    });
  }

  /**
   * Create post published notification
   * @param {string} postId - Post ID
   * @param {string} authorId - Post author ID
   * @returns {Promise<Object>} Created notification
   */
  async createPostPublishedNotification(postId, authorId) {
    return this.createNotification({
      user: authorId,
      type: 'post_published',
      title: 'Post Published',
      message: 'Your post has been published',
      link: `/post/${postId}`,
      relatedPost: postId,
    });
  }
}

module.exports = new NotificationService();

