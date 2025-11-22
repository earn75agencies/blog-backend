/**
 * Predictive Analytics Service
 * AI-powered predictive analytics for authors, users, and admins
 */

const User = require('../../models/User.model');
const Post = require('../../models/Post.model');
const View = require('../../models/View.model');
const Comment = require('../../models/Comment.model');

class PredictiveAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1 hour
  }

  /**
   * Predict post performance
   * @param {Object} postData - Post data
   * @param {Object} authorData - Author data
   * @returns {Promise<Object>} Performance predictions
   */
  async predictPostPerformance(postData, authorData) {
    try {
      // Analyze historical data
      const authorPosts = await Post.find({ author: authorData._id })
        .select('views likesCount commentsCount sharesCount publishedAt category tags')
        .limit(100)
        .sort({ publishedAt: -1 });

      const avgPerformance = this.calculateAveragePerformance(authorPosts);
      const categoryPerformance = this.calculateCategoryPerformance(authorPosts, postData.category);
      const timeBasedPerformance = this.calculateTimeBasedPerformance(authorPosts);

      // Predict views
      const predictedViews = this.predictViews(
        avgPerformance,
        categoryPerformance,
        timeBasedPerformance,
        postData
      );

      // Predict engagement
      const predictedEngagement = this.predictEngagement(
        avgPerformance,
        postData
      );

      // Predict revenue (if monetized)
      const predictedRevenue = this.predictRevenue(
        predictedViews,
        authorData.membership?.plan || 'free'
      );

      return {
        views: {
          predicted: predictedViews,
          confidence: this.calculateConfidence(authorPosts.length),
          range: {
            min: Math.round(predictedViews * 0.7),
            max: Math.round(predictedViews * 1.5),
          },
        },
        engagement: {
          likes: predictedEngagement.likes,
          comments: predictedEngagement.comments,
          shares: predictedEngagement.shares,
          engagementRate: predictedEngagement.rate,
        },
        revenue: {
          predicted: predictedRevenue,
          currency: 'USD',
        },
        recommendations: this.getPerformanceRecommendations(
          predictedViews,
          predictedEngagement,
          postData
        ),
      };
    } catch (error) {
      console.error('Predictive Analytics Error:', error);
      return this.getFallbackPredictions();
    }
  }

  /**
   * Cohort analysis
   * @param {String} cohortType - Type of cohort (signup, first_post, etc.)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Cohort analysis results
   */
  async analyzeCohorts(cohortType = 'signup', startDate, endDate) {
    try {
      const query = {};
      if (startDate) query.createdAt = { $gte: startDate };
      if (endDate) query.createdAt = { ...query.createdAt, $lte: endDate };

      const users = await User.find(query)
        .select('createdAt role')
        .lean();

      // Group by cohort (monthly)
      const cohorts = this.groupByCohort(users, cohortType);
      
      // Calculate retention for each cohort
      const cohortAnalysis = await Promise.all(
        Object.entries(cohorts).map(async ([cohort, users]) => {
          const retention = await this.calculateRetention(users, cohort);
          return {
            cohort,
            size: users.length,
            retention,
          };
        })
      );

      return {
        cohorts: cohortAnalysis,
        summary: this.calculateCohortSummary(cohortAnalysis),
      };
    } catch (error) {
      console.error('Cohort Analysis Error:', error);
      return { cohorts: [], summary: {} };
    }
  }

  /**
   * Behavioral segmentation
   * @param {Object} filters - Segmentation filters
   * @returns {Promise<Object>} User segments
   */
  async segmentUsers(filters = {}) {
    try {
      const segments = {
        powerUsers: [],
        casualUsers: [],
        creators: [],
        readers: [],
        inactive: [],
      };

      const users = await User.find(filters)
        .select('username role createdAt')
        .lean();

      for (const user of users) {
        const behavior = await this.analyzeUserBehavior(user._id);
        const segment = this.assignSegment(behavior);
        segments[segment].push({
          user: user._id,
          username: user.username,
          behavior,
        });
      }

      return {
        segments,
        summary: {
          total: users.length,
          powerUsers: segments.powerUsers.length,
          casualUsers: segments.casualUsers.length,
          creators: segments.creators.length,
          readers: segments.readers.length,
          inactive: segments.inactive.length,
        },
      };
    } catch (error) {
      console.error('User Segmentation Error:', error);
      return { segments: {}, summary: {} };
    }
  }

  /**
   * Predict user churn
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Churn prediction
   */
  async predictChurn(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const behavior = await this.analyzeUserBehavior(userId);
      const lastActivity = await this.getLastActivity(userId);
      const daysSinceActivity = this.getDaysSince(lastActivity);

      // Calculate churn probability
      const churnScore = this.calculateChurnScore(behavior, daysSinceActivity);

      return {
        userId,
        churnProbability: churnScore,
        riskLevel: this.getRiskLevel(churnScore),
        daysSinceActivity,
        recommendations: this.getChurnPreventionRecommendations(churnScore, behavior),
      };
    } catch (error) {
      console.error('Churn Prediction Error:', error);
      return {
        userId,
        churnProbability: 0.5,
        riskLevel: 'medium',
        daysSinceActivity: 0,
        recommendations: [],
      };
    }
  }

  // Helper Methods

  calculateAveragePerformance(posts) {
    if (posts.length === 0) {
      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }

    return {
      views: posts.reduce((sum, p) => sum + (p.views || 0), 0) / posts.length,
      likes: posts.reduce((sum, p) => sum + (p.likesCount || 0), 0) / posts.length,
      comments: posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0) / posts.length,
      shares: posts.reduce((sum, p) => sum + (p.sharesCount || 0), 0) / posts.length,
    };
  }

  calculateCategoryPerformance(posts, category) {
    const categoryPosts = posts.filter(p => 
      p.category?.toString() === category?.toString()
    );
    
    if (categoryPosts.length === 0) {
      return { views: 0, multiplier: 1 };
    }

    const avgViews = categoryPosts.reduce((sum, p) => sum + (p.views || 0), 0) / categoryPosts.length;
    const overallAvg = posts.reduce((sum, p) => sum + (p.views || 0), 0) / posts.length;
    
    return {
      views: avgViews,
      multiplier: overallAvg > 0 ? avgViews / overallAvg : 1,
    };
  }

  calculateTimeBasedPerformance(posts) {
    const now = new Date();
    const recentPosts = posts.filter(p => {
      const daysAgo = (now - new Date(p.publishedAt)) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    });

    if (recentPosts.length === 0) {
      return { views: 0, multiplier: 1 };
    }

    const avgViews = recentPosts.reduce((sum, p) => sum + (p.views || 0), 0) / recentPosts.length;
    const overallAvg = posts.reduce((sum, p) => sum + (p.views || 0), 0) / posts.length;

    return {
      views: avgViews,
      multiplier: overallAvg > 0 ? avgViews / overallAvg : 1,
    };
  }

  predictViews(avgPerformance, categoryPerformance, timeBasedPerformance, postData) {
    let predicted = avgPerformance.views;

    // Apply category multiplier
    predicted *= categoryPerformance.multiplier;

    // Apply time-based multiplier
    predicted *= timeBasedPerformance.multiplier;

    // Adjust for post features
    if (postData.isFeatured) predicted *= 1.5;
    if (postData.tags && postData.tags.length > 5) predicted *= 1.2;

    return Math.round(predicted);
  }

  predictEngagement(avgPerformance, postData) {
    const likes = Math.round(avgPerformance.likes * (postData.views || 1000) / 1000);
    const comments = Math.round(avgPerformance.comments * (postData.views || 1000) / 1000);
    const shares = Math.round(avgPerformance.shares * (postData.views || 1000) / 1000);
    const totalEngagement = likes + comments + shares;
    const engagementRate = postData.views > 0 ? (totalEngagement / postData.views) * 100 : 0;

    return {
      likes,
      comments,
      shares,
      rate: Math.round(engagementRate * 100) / 100,
    };
  }

  predictRevenue(predictedViews, membershipPlan) {
    const revenuePerView = {
      free: 0,
      basic: 0.001,
      premium: 0.002,
      enterprise: 0.005,
    };

    return Math.round(predictedViews * (revenuePerView[membershipPlan] || 0) * 100) / 100;
  }

  calculateConfidence(sampleSize) {
    // More data = higher confidence
    if (sampleSize >= 50) return 0.9;
    if (sampleSize >= 20) return 0.7;
    if (sampleSize >= 10) return 0.5;
    return 0.3;
  }

  getPerformanceRecommendations(predictedViews, predictedEngagement, postData) {
    const recommendations = [];

    if (predictedViews < 100) {
      recommendations.push('Consider promoting on social media');
      recommendations.push('Add more relevant tags');
    }

    if (predictedEngagement.rate < 2) {
      recommendations.push('Improve content engagement with questions');
      recommendations.push('Add call-to-action');
    }

    if (!postData.isFeatured) {
      recommendations.push('Request featured post status');
    }

    return recommendations;
  }

  getFallbackPredictions() {
    return {
      views: { predicted: 100, confidence: 0.5, range: { min: 70, max: 150 } },
      engagement: { likes: 10, comments: 5, shares: 2, engagementRate: 1.7 },
      revenue: { predicted: 0, currency: 'USD' },
      recommendations: [],
    };
  }

  groupByCohort(users, cohortType) {
    const cohorts = {};
    
    users.forEach(user => {
      const date = new Date(user.createdAt);
      const cohort = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!cohorts[cohort]) {
        cohorts[cohort] = [];
      }
      cohorts[cohort].push(user);
    });

    return cohorts;
  }

  async calculateRetention(users, cohort) {
    const now = new Date();
    const cohortDate = new Date(cohort + '-01');
    const monthsSince = (now - cohortDate) / (1000 * 60 * 60 * 24 * 30);

    const activeUsers = await Promise.all(
      users.map(async user => {
        const lastActivity = await this.getLastActivity(user._id);
        const daysSince = this.getDaysSince(lastActivity);
        return daysSince <= 30; // Active if activity in last 30 days
      })
    );

    const activeCount = activeUsers.filter(Boolean).length;
    const retentionRate = users.length > 0 ? (activeCount / users.length) * 100 : 0;

    return {
      monthsSince: Math.floor(monthsSince),
      activeUsers: activeCount,
      totalUsers: users.length,
      retentionRate: Math.round(retentionRate * 100) / 100,
    };
  }

  calculateCohortSummary(cohortAnalysis) {
    if (cohortAnalysis.length === 0) {
      return {};
    }

    const avgRetention = cohortAnalysis.reduce(
      (sum, c) => sum + c.retention.retentionRate,
      0
    ) / cohortAnalysis.length;

    return {
      totalCohorts: cohortAnalysis.length,
      averageRetention: Math.round(avgRetention * 100) / 100,
      bestCohort: cohortAnalysis.reduce((best, current) =>
        current.retention.retentionRate > best.retention.retentionRate ? current : best
      ),
    };
  }

  async analyzeUserBehavior(userId) {
    const posts = await Post.countDocuments({ author: userId });
    const views = await View.countDocuments({ user: userId });
    const comments = await Comment.countDocuments({ author: userId });
    const lastActivity = await this.getLastActivity(userId);
    const daysSinceActivity = this.getDaysSince(lastActivity);

    return {
      posts,
      views,
      comments,
      daysSinceActivity,
      activityScore: this.calculateActivityScore(posts, views, comments, daysSinceActivity),
    };
  }

  calculateActivityScore(posts, views, comments, daysSinceActivity) {
    let score = 0;
    score += posts * 10;
    score += views * 0.1;
    score += comments * 5;
    score -= daysSinceActivity * 0.5;
    return Math.max(0, score);
  }

  assignSegment(behavior) {
    if (behavior.daysSinceActivity > 90) return 'inactive';
    if (behavior.posts > 10 && behavior.activityScore > 100) return 'powerUsers';
    if (behavior.posts > 0) return 'creators';
    if (behavior.views > 50) return 'readers';
    return 'casualUsers';
  }

  async getLastActivity(userId) {
    const lastPost = await Post.findOne({ author: userId })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();

    const lastView = await View.findOne({ user: userId })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();

    const lastComment = await Comment.findOne({ author: userId })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();

    const dates = [lastPost?.createdAt, lastView?.createdAt, lastComment?.createdAt]
      .filter(Boolean)
      .map(d => new Date(d));

    return dates.length > 0 ? new Date(Math.max(...dates)) : null;
  }

  getDaysSince(date) {
    if (!date) return 999;
    return Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
  }

  calculateChurnScore(behavior, daysSinceActivity) {
    let score = 0;

    // Days since activity (higher = more likely to churn)
    if (daysSinceActivity > 90) score += 0.5;
    else if (daysSinceActivity > 60) score += 0.3;
    else if (daysSinceActivity > 30) score += 0.1;

    // Low activity
    if (behavior.activityScore < 10) score += 0.3;
    else if (behavior.activityScore < 50) score += 0.1;

    // No posts
    if (behavior.posts === 0) score += 0.2;

    return Math.min(1, score);
  }

  getRiskLevel(churnScore) {
    if (churnScore > 0.7) return 'high';
    if (churnScore > 0.4) return 'medium';
    return 'low';
  }

  getChurnPreventionRecommendations(churnScore, behavior) {
    const recommendations = [];

    if (churnScore > 0.5) {
      recommendations.push('Send re-engagement email');
      recommendations.push('Offer personalized content recommendations');
    }

    if (behavior.posts === 0) {
      recommendations.push('Encourage first post creation');
      recommendations.push('Provide content creation tips');
    }

    if (behavior.daysSinceActivity > 30) {
      recommendations.push('Send activity reminder');
      recommendations.push('Highlight trending topics');
    }

    return recommendations;
  }
}

module.exports = new PredictiveAnalyticsService();

