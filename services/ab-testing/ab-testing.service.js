/**
 * A/B Testing Service
 * Large-scale A/B testing and experiment automation
 */

const Experiment = require('../../models/Experiment.model');
const Variant = require('../../models/Variant.model');
const { asyncHandler } = require('../../utils/asyncHandler');

class ABTestingService {
  constructor() {
    this.activeExperiments = new Map();
    this.userAssignments = new Map(); // Cache user assignments
  }

  /**
   * Create A/B test experiment
   * @param {Object} experimentData - Experiment configuration
   * @returns {Promise<Object>} Created experiment
   */
  async createExperiment(experimentData) {
    const {
      name,
      description,
      hypothesis,
      variants,
      trafficSplit,
      targetAudience,
      metrics,
      duration,
      startDate,
    } = experimentData;

    const experiment = await Experiment.create({
      name,
      description,
      hypothesis,
      variants: variants || [],
      trafficSplit: trafficSplit || { a: 50, b: 50 },
      targetAudience: targetAudience || {},
      metrics: metrics || [],
      duration: duration || 7, // days
      startDate: startDate || new Date(),
      status: 'draft',
    });

    // Create variants
    if (variants && variants.length > 0) {
      const variantPromises = variants.map((variant, index) =>
        Variant.create({
          experiment: experiment._id,
          name: variant.name || `Variant ${String.fromCharCode(65 + index)}`,
          description: variant.description,
          configuration: variant.configuration || {},
          trafficPercentage: variant.trafficPercentage || (100 / variants.length),
        })
      );

      await Promise.all(variantPromises);
    }

    return experiment;
  }

  /**
   * Assign user to experiment variant
   * @param {String} experimentId - Experiment ID
   * @param {String} userId - User ID
   * @returns {Promise<String>} Variant name
   */
  async assignUserToVariant(experimentId, userId) {
    const cacheKey = `${experimentId}:${userId}`;
    
    // Check cache
    if (this.userAssignments.has(cacheKey)) {
      return this.userAssignments.get(cacheKey);
    }

    const experiment = await Experiment.findById(experimentId);
    if (!experiment || experiment.status !== 'active') {
      return 'control';
    }

    // Check if user matches target audience
    if (!this.matchesTargetAudience(userId, experiment.targetAudience)) {
      return 'control';
    }

    // Get variants
    const variants = await Variant.find({ experiment: experimentId })
      .sort({ trafficPercentage: -1 });

    if (variants.length === 0) {
      return 'control';
    }

    // Assign based on consistent hashing
    const assignment = this.getConsistentAssignment(userId, variants);
    
    // Cache assignment
    this.userAssignments.set(cacheKey, assignment);
    
    // Record assignment
    await this.recordAssignment(experimentId, userId, assignment);

    return assignment;
  }

  /**
   * Track experiment event
   * @param {String} experimentId - Experiment ID
   * @param {String} userId - User ID
   * @param {String} event - Event name
   * @param {Object} data - Event data
   * @returns {Promise<void>}
   */
  async trackEvent(experimentId, userId, event, data = {}) {
    const variant = await this.assignUserToVariant(experimentId, userId);
    
    await Variant.findOneAndUpdate(
      { experiment: experimentId, name: variant },
      {
        $inc: { [`events.${event}.count`]: 1 },
        $push: {
          [`events.${event}.data`]: {
            userId,
            timestamp: new Date(),
            data,
          },
        },
      }
    );
  }

  /**
   * Get experiment results
   * @param {String} experimentId - Experiment ID
   * @returns {Promise<Object>} Experiment results
   */
  async getResults(experimentId) {
    const experiment = await Experiment.findById(experimentId)
      .populate('variants');
    
    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const variants = await Variant.find({ experiment: experimentId });
    const results = await Promise.all(
      variants.map(async variant => {
        const metrics = await this.calculateMetrics(variant, experiment.metrics);
        return {
          variant: variant.name,
          metrics,
          sampleSize: this.getSampleSize(variant),
          statisticalSignificance: await this.calculateSignificance(
            variant,
            variants,
            experiment.metrics
          ),
        };
      })
    );

    return {
      experiment: {
        name: experiment.name,
        status: experiment.status,
        startDate: experiment.startDate,
        endDate: experiment.endDate,
      },
      results,
      winner: this.determineWinner(results),
      recommendations: this.getRecommendations(results, experiment),
    };
  }

  /**
   * Start experiment
   * @param {String} experimentId - Experiment ID
   * @returns {Promise<Object>} Started experiment
   */
  async startExperiment(experimentId) {
    const experiment = await Experiment.findById(experimentId);
    if (!experiment) {
      throw new Error('Experiment not found');
    }

    experiment.status = 'active';
    experiment.startDate = new Date();
    experiment.endDate = new Date(
      experiment.startDate.getTime() + experiment.duration * 24 * 60 * 60 * 1000
    );
    await experiment.save();

    // Load into memory for fast access
    this.activeExperiments.set(experimentId, experiment);

    return experiment;
  }

  /**
   * Stop experiment
   * @param {String} experimentId - Experiment ID
   * @returns {Promise<Object>} Stopped experiment
   */
  async stopExperiment(experimentId) {
    const experiment = await Experiment.findById(experimentId);
    if (!experiment) {
      throw new Error('Experiment not found');
    }

    experiment.status = 'completed';
    experiment.endDate = new Date();
    await experiment.save();

    // Remove from memory
    this.activeExperiments.delete(experimentId);

    return experiment;
  }

  // Helper Methods

  matchesTargetAudience(userId, targetAudience) {
    // Check user attributes against target audience criteria
    if (!targetAudience || Object.keys(targetAudience).length === 0) {
      return true; // No restrictions means all users match
    }

    // Get user data to match against audience
    const User = require('../../models/User.model');
    return User.findById(userId).then(user => {
      if (!user) return false;

      // Match by role
      if (targetAudience.roles && targetAudience.roles.length > 0) {
        if (!targetAudience.roles.includes(user.role)) {
          return false;
        }
      }

      // Match by email domain (if specified)
      if (targetAudience.emailDomains && targetAudience.emailDomains.length > 0) {
        const userDomain = user.email.split('@')[1];
        if (!targetAudience.emailDomains.includes(userDomain)) {
          return false;
        }
      }

      // Match by registration date range
      if (targetAudience.registeredAfter || targetAudience.registeredBefore) {
        const regDate = new Date(user.createdAt);
        if (targetAudience.registeredAfter && regDate < new Date(targetAudience.registeredAfter)) {
          return false;
        }
        if (targetAudience.registeredBefore && regDate > new Date(targetAudience.registeredBefore)) {
          return false;
        }
      }

      // Match by location/region (if user has location data)
      if (targetAudience.regions && targetAudience.regions.length > 0 && user.location) {
        if (!targetAudience.regions.includes(user.location.region || user.location.country)) {
          return false;
        }
      }

      // Match by user tags/interests (if specified)
      if (targetAudience.tags && targetAudience.tags.length > 0 && user.interests) {
        const hasMatchingTag = targetAudience.tags.some(tag => 
          user.interests.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true; // All criteria matched
    }).catch(() => false);
  }

  getConsistentAssignment(userId, variants) {
    // Use consistent hashing to ensure same user gets same variant
    const hash = this.hashUserId(userId);
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.trafficPercentage;
      if (hash % 100 < cumulative) {
        return variant.name;
      }
    }

    return variants[0]?.name || 'control';
  }

  hashUserId(userId) {
    // Simple hash function
    let hash = 0;
    const str = userId.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async recordAssignment(experimentId, userId, variant) {
    // Record assignment in database for analytics
    await Experiment.findByIdAndUpdate(experimentId, {
      $inc: { [`assignments.${variant}`]: 1 },
    });
  }

  async calculateMetrics(variant, metricDefinitions) {
    const metrics = {};

    for (const metric of metricDefinitions) {
      const eventData = variant.events?.[metric.event] || {};
      const count = eventData.count || 0;
      const sampleSize = this.getSampleSize(variant);

      if (metric.type === 'conversion') {
        metrics[metric.name] = {
          value: sampleSize > 0 ? (count / sampleSize) * 100 : 0,
          count,
          sampleSize,
        };
      } else if (metric.type === 'average') {
        const values = (eventData.data || []).map(d => d.data?.value || 0);
        metrics[metric.name] = {
          value: values.length > 0
            ? values.reduce((a, b) => a + b, 0) / values.length
            : 0,
          count,
        };
      } else {
        metrics[metric.name] = {
          value: count,
          count,
        };
      }
    }

    return metrics;
  }

  getSampleSize(variant) {
    return variant.assignments || 0;
  }

  async calculateSignificance(variant, allVariants, metrics) {
    // Statistical significance calculation using Chi-Square test for proportions
    const controlVariant = allVariants.find(v => v.name === 'control' || v.name === 'A');
    if (!controlVariant || variant.name === controlVariant.name) {
      return { pValue: 1, significant: false, confidence: 0 };
    }

    // Get sample sizes and conversions for both variants
    const variantSampleSize = variant.assignments || 0;
    const controlSampleSize = controlVariant.assignments || 0;

    if (variantSampleSize === 0 || controlSampleSize === 0) {
      return { pValue: 1, significant: false, confidence: 0 };
    }

    // Calculate conversion rates for primary metric (usually first metric)
    const primaryMetricName = Object.keys(metrics)[0] || 'conversion';
    const variantMetric = variant.metrics?.[primaryMetricName] || metrics[primaryMetricName];
    const controlMetric = controlVariant.metrics?.[primaryMetricName] || metrics[primaryMetricName];

    // Get conversions (assume metric value represents conversions or use count)
    const variantConversions = variantMetric?.count || variantMetric?.value || 0;
    const controlConversions = controlMetric?.count || controlMetric?.value || 0;

    // Calculate conversion rates
    const variantRate = variantConversions / variantSampleSize;
    const controlRate = controlConversions / controlSampleSize;

    // Perform Chi-Square test for independence
    const chiSquareResult = this.chiSquareTest(
      variantConversions,
      variantSampleSize - variantConversions,
      controlConversions,
      controlSampleSize - controlConversions
    );

    // Calculate confidence level (1 - p-value)
    const confidence = Math.max(0, Math.min(100, (1 - chiSquareResult.pValue) * 100));

    return {
      pValue: chiSquareResult.pValue,
      significant: chiSquareResult.pValue < 0.05, // 95% confidence level
      confidence: Math.round(confidence),
      chiSquare: chiSquareResult.chiSquare,
      variantRate,
      controlRate,
      lift: controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0,
    };
  }

  /**
   * Chi-Square test for 2x2 contingency table
   * Tests independence between variant and conversion
   * @param {number} a - Conversions in variant
   * @param {number} b - Non-conversions in variant
   * @param {number} c - Conversions in control
   * @param {number} d - Non-conversions in control
   * @returns {Object} Chi-square statistic, degrees of freedom, and p-value
   */
  chiSquareTest(a, b, c, d) {
    const n = a + b + c + d;
    
    if (n === 0) {
      return { chiSquare: 0, df: 1, pValue: 1 };
    }

    // Calculate expected values
    const e11 = ((a + b) * (a + c)) / n;
    const e12 = ((a + b) * (b + d)) / n;
    const e21 = ((c + d) * (a + c)) / n;
    const e22 = ((c + d) * (b + d)) / n;

    // Calculate chi-square statistic
    let chiSquare = 0;
    
    // Apply Yates' correction for continuity (recommended for 2x2 tables)
    chiSquare += Math.pow(Math.abs(a - e11) - 0.5, 2) / e11;
    chiSquare += Math.pow(Math.abs(b - e12) - 0.5, 2) / e12;
    chiSquare += Math.pow(Math.abs(c - e21) - 0.5, 2) / e21;
    chiSquare += Math.pow(Math.abs(d - e22) - 0.5, 2) / e22;

    // Degrees of freedom for 2x2 table = 1
    const df = 1;

    // Calculate p-value using chi-square distribution
    // For df=1, we can use a simplified calculation or lookup table
    // Using approximation: p-value for chi-square with df=1
    const pValue = this.chiSquarePValue(chiSquare, df);

    return {
      chiSquare,
      df,
      pValue,
    };
  }

  /**
   * Calculate p-value from chi-square statistic
   * Uses approximation for chi-square distribution with df=1
   * @param {number} chiSquare - Chi-square statistic
   * @param {number} df - Degrees of freedom
   * @returns {number} p-value
   */
  chiSquarePValue(chiSquare, df) {
    if (df !== 1) {
      // For other df, would need more complex calculation
      // For simplicity, using approximation
      return this.approximatePValue(chiSquare, df);
    }

    // For df=1, chi-square distribution is square of standard normal
    // Using approximation: p-value ≈ 2 * (1 - Φ(√χ²))
    // Where Φ is standard normal CDF
    
    const z = Math.sqrt(chiSquare);
    
    // Approximate standard normal CDF using error function
    const p = this.normalCDF(z);
    
    // Two-tailed test
    return 2 * (1 - p);
  }

  /**
   * Approximate standard normal cumulative distribution function
   * Using error function approximation
   */
  normalCDF(z) {
    if (z < -6) return 0;
    if (z > 6) return 1;

    // Approximation using error function
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return z > 0 ? 1 - p : p;
  }

  /**
   * Approximate p-value for chi-square distribution
   * For df > 1, uses Wilson-Hilferty transformation
   */
  approximatePValue(chiSquare, df) {
    if (df === 1) {
      return this.chiSquarePValue(chiSquare, 1);
    }

    // Wilson-Hilferty transformation: converts chi-square to approximately normal
    const h = 2 / (9 * df);
    const z = (Math.pow(chiSquare / df, 1/3) - (1 - h)) / Math.sqrt(h);
    
    return 1 - this.normalCDF(z);
  }

  determineWinner(results) {
    if (results.length < 2) return null;

    // Find variant with best performance
    const winner = results.reduce((best, current) => {
      const bestScore = this.calculateOverallScore(best);
      const currentScore = this.calculateOverallScore(current);
      return currentScore > bestScore ? current : best;
    });

    return winner.variant;
  }

  calculateOverallScore(result) {
    // Calculate overall score from all metrics
    let score = 0;
    Object.values(result.metrics).forEach(metric => {
      score += metric.value || 0;
    });
    return score;
  }

  getRecommendations(results, experiment) {
    const recommendations = [];

    if (results.length < 2) {
      recommendations.push('Need at least 2 variants for valid A/B test');
    }

    const winner = this.determineWinner(results);
    if (winner) {
      recommendations.push(`Winner: ${winner} - Consider implementing this variant`);
    }

    results.forEach(result => {
      if (result.sampleSize < 100) {
        recommendations.push(
          `${result.variant} needs larger sample size (currently ${result.sampleSize})`
        );
      }
    });

    return recommendations;
  }
}

module.exports = new ABTestingService();

