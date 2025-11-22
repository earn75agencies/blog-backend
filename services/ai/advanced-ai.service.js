/**
 * Advanced AI Service
 * Hyper-scale AI capabilities for content generation, translation,
 * toxicity analysis, and predictive analytics
 */

const axios = require('axios');
const natural = require('natural');
const { OpenAI } = require('openai');

class AdvancedAIService {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null;
    this.enableAI = process.env.ENABLE_AI === 'true';
    this.cache = new Map(); // Simple in-memory cache
  }

  /**
   * Generate full blog post content using AI
   * @param {Object} params - Generation parameters
   * @returns {Promise<Object>} Generated content
   */
  async generateBlogPost({ topic, tone, length, targetAudience, keywords = [] }) {
    if (!this.enableAI || !this.openai) {
      return this.getFallbackPost(topic);
    }

    try {
      const prompt = `Write a comprehensive blog post about "${topic}".

Requirements:
- Tone: ${tone || 'professional'}
- Target Audience: ${targetAudience || 'general public'}
- Length: ${length || 'medium'} (approximately ${this.getWordCount(length)} words)
- Keywords to include: ${keywords.join(', ') || 'none specified'}
- Include: Introduction, main content with subheadings, conclusion
- Make it engaging, informative, and SEO-friendly

Generate the post with:
1. Title (compelling and SEO-optimized)
2. Excerpt (2-3 sentences)
3. Full content (well-structured with subheadings)
4. Suggested tags (5-7 tags)
5. SEO meta description`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert blog writer and SEO specialist.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: this.getMaxTokens(length),
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseGeneratedPost(content, topic);
    } catch (error) {
      console.error('AI Post Generation Error:', error);
      return this.getFallbackPost(topic);
    }
  }

  /**
   * Generate content summaries
   * @param {String} content - Content to summarize
   * @param {Number} maxLength - Maximum summary length
   * @returns {Promise<String>} Summary
   */
  async generateSummary(content, maxLength = 200) {
    if (!this.enableAI || !this.openai) {
      return this.getFallbackSummary(content, maxLength);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a content summarization expert.' },
          { role: 'user', content: `Summarize this content in ${maxLength} words or less:\n\n${content.substring(0, 4000)}` },
        ],
        max_tokens: Math.ceil(maxLength / 0.75),
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content?.trim() || this.getFallbackSummary(content, maxLength);
    } catch (error) {
      console.error('AI Summary Generation Error:', error);
      return this.getFallbackSummary(content, maxLength);
    }
  }

  /**
   * Translate content to multiple languages
   * @param {String} content - Content to translate
   * @param {String} targetLanguage - Target language code
   * @param {String} sourceLanguage - Source language code
   * @returns {Promise<String>} Translated content
   */
  async translateContent(content, targetLanguage = 'en', sourceLanguage = 'auto') {
    if (!this.enableAI || !this.openai) {
      return content; // Return original if AI disabled
    }

    const cacheKey = `translate:${sourceLanguage}:${targetLanguage}:${content.substring(0, 50)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const languageNames = {
        en: 'English', es: 'Spanish', fr: 'French', de: 'German',
        it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
        ko: 'Korean', zh: 'Chinese', ar: 'Arabic', hi: 'Hindi',
      };

      const targetLangName = languageNames[targetLanguage] || targetLanguage;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: `You are a professional translator. Translate content accurately while preserving tone, style, and meaning.` },
          { role: 'user', content: `Translate this content to ${targetLangName}:\n\n${content.substring(0, 3000)}` },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const translated = response.choices[0]?.message?.content?.trim() || content;
      this.cache.set(cacheKey, translated);
      return translated;
    } catch (error) {
      console.error('AI Translation Error:', error);
      return content;
    }
  }

  /**
   * Analyze content toxicity and safety
   * @param {String} content - Content to analyze
   * @returns {Promise<Object>} Toxicity analysis
   */
  async analyzeToxicity(content) {
    if (!this.enableAI || !this.openai) {
      return this.getFallbackToxicity(content);
    }

    try {
      const response = await this.openai.moderations.create({
        input: content.substring(0, 10000),
      });

      const result = response.results[0];
      
      return {
        flagged: result.flagged,
        categories: result.categories,
        categoryScores: result.category_scores,
        severity: this.calculateSeverity(result.category_scores),
        recommendations: this.getRecommendations(result),
      };
    } catch (error) {
      console.error('AI Toxicity Analysis Error:', error);
      return this.getFallbackToxicity(content);
    }
  }

  /**
   * Predict trending topics and hashtags
   * @param {Object} context - Current trends and data
   * @returns {Promise<Array>} Predicted trending topics
   */
  async predictTrendingTopics(context = {}) {
    if (!this.enableAI || !this.openai) {
      return this.getFallbackTrending();
    }

    try {
      const prompt = `Based on current trends and data, predict the top 10 trending topics and hashtags for the next 7 days.

Current trends: ${JSON.stringify(context.currentTrends || {})}
Historical data: ${JSON.stringify(context.historicalData || {})}
Industry: ${context.industry || 'general'}

Provide predictions in JSON format:
{
  "topics": [
    {"topic": "topic name", "confidence": 0.0-1.0, "reason": "why it will trend"},
    ...
  ],
  "hashtags": [
    {"hashtag": "#hashtag", "confidence": 0.0-1.0, "reason": "why it will trend"},
    ...
  ]
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a trend prediction expert with deep knowledge of social media and content trends.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || '{}';
      return this.parseTrendingPrediction(content);
    } catch (error) {
      console.error('AI Trend Prediction Error:', error);
      return this.getFallbackTrending();
    }
  }

  /**
   * AI-assisted writing tools
   * @param {String} text - Text to improve
   * @param {String} action - Action (improve, shorten, expand, formalize, casualize)
   * @returns {Promise<String>} Improved text
   */
  async assistWriting(text, action = 'improve') {
    if (!this.enableAI || !this.openai) {
      return text;
    }

    const actions = {
      improve: 'Improve this text for clarity, engagement, and readability while maintaining the original meaning.',
      shorten: 'Make this text more concise while preserving all key information.',
      expand: 'Expand this text with more details, examples, and explanations.',
      formalize: 'Rewrite this text in a more formal, professional tone.',
      casualize: 'Rewrite this text in a more casual, friendly tone.',
    };

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a professional writing assistant.' },
          { role: 'user', content: `${actions[action] || actions.improve}\n\n${text.substring(0, 3000)}` },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content?.trim() || text;
    } catch (error) {
      console.error('AI Writing Assistance Error:', error);
      return text;
    }
  }

  /**
   * Hyper-personalized recommendations
   * @param {Object} userProfile - Comprehensive user profile
   * @param {Array} availableContent - Available content pool
   * @param {Number} limit - Number of recommendations
   * @returns {Promise<Array>} Personalized recommendations
   */
  async getHyperPersonalizedRecommendations(userProfile, availableContent = [], limit = 10) {
    if (!this.enableAI || !this.openai || availableContent.length === 0) {
      return this.getFallbackRecommendations(userProfile, availableContent, limit);
    }

    try {
      // Build comprehensive user context
      const userContext = {
        readingHistory: userProfile.readingHistory || [],
        preferences: userProfile.preferences || {},
        behavior: userProfile.behavior || {},
        demographics: userProfile.demographics || {},
        engagement: userProfile.engagement || {},
      };

      const contentSummary = availableContent.slice(0, 50).map(c => ({
        id: c._id?.toString(),
        title: c.title,
        category: c.category?.name,
        tags: c.tags?.map(t => t.name),
        excerpt: c.excerpt?.substring(0, 100),
      }));

      const prompt = `Based on this user profile, recommend the most relevant content from the available options.

User Profile:
${JSON.stringify(userContext, null, 2)}

Available Content (first 50):
${JSON.stringify(contentSummary, null, 2)}

Provide recommendations in JSON format:
{
  "recommendations": [
    {"contentId": "id", "score": 0.0-1.0, "reason": "why recommended"},
    ...
  ]
}

Return top ${limit} recommendations.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert content recommendation system.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.5,
      });

      const result = this.parseRecommendations(response.choices[0]?.message?.content || '{}');
      return this.mapRecommendationsToContent(result, availableContent, limit);
    } catch (error) {
      console.error('AI Hyper-Personalization Error:', error);
      return this.getFallbackRecommendations(userProfile, availableContent, limit);
    }
  }

  // Helper Methods

  getWordCount(length) {
    const counts = {
      short: 500,
      medium: 1500,
      long: 3000,
      'very-long': 5000,
    };
    return counts[length] || 1500;
  }

  getMaxTokens(length) {
    return Math.ceil(this.getWordCount(length) / 0.75);
  }

  parseGeneratedPost(content, topic) {
    try {
      const sections = {
        title: '',
        excerpt: '',
        content: '',
        tags: [],
        seoDescription: '',
      };

      // Try to extract structured content
      const titleMatch = content.match(/title[:\s]+(.+)/i);
      const excerptMatch = content.match(/excerpt[:\s]+(.+?)(?:\n|$)/i);
      const contentMatch = content.match(/content[:\s]+(.+?)(?:tags|seo|$)/is);
      const tagsMatch = content.match(/tags?[:\s]+(.+?)(?:\n|$)/i);
      const seoMatch = content.match(/seo[:\s]+(.+?)(?:\n|$)/i);

      if (titleMatch) sections.title = titleMatch[1].trim();
      if (excerptMatch) sections.excerpt = excerptMatch[1].trim();
      if (contentMatch) sections.content = contentMatch[1].trim();
      if (tagsMatch) sections.tags = tagsMatch[1].split(',').map(t => t.trim());
      if (seoMatch) sections.seoDescription = seoMatch[1].trim();

      // Fallback: use content as-is if parsing fails
      if (!sections.title) {
        const lines = content.split('\n').filter(l => l.trim());
        sections.title = lines[0] || topic;
        sections.excerpt = lines[1] || '';
        sections.content = content;
      }

      return sections;
    } catch (error) {
      return this.getFallbackPost(topic);
    }
  }

  getFallbackPost(topic) {
    return {
      title: `Understanding ${topic}`,
      excerpt: `A comprehensive guide to ${topic}.`,
      content: `# ${topic}\n\nThis is a placeholder post about ${topic}.`,
      tags: [topic.toLowerCase()],
      seoDescription: `Learn about ${topic} in this comprehensive guide.`,
    };
  }

  getFallbackSummary(content, maxLength) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    let summary = '';
    for (const sentence of sentences) {
      if (summary.length + sentence.length > maxLength) break;
      summary += sentence.trim() + '. ';
    }
    return summary.trim() || content.substring(0, maxLength);
  }

  calculateSeverity(categoryScores) {
    const maxScore = Math.max(...Object.values(categoryScores));
    if (maxScore > 0.9) return 'high';
    if (maxScore > 0.7) return 'medium';
    if (maxScore > 0.5) return 'low';
    return 'none';
  }

  getRecommendations(result) {
    const recommendations = [];
    if (result.flagged) {
      recommendations.push('Content requires moderation review');
    }
    if (result.categories.hate) {
      recommendations.push('Remove hate speech content');
    }
    if (result.categories['sexual/minors']) {
      recommendations.push('Remove inappropriate content');
    }
    return recommendations;
  }

  getFallbackToxicity(content) {
    // Simple keyword-based fallback
    const toxicKeywords = ['hate', 'violence', 'abuse'];
    const lowerContent = content.toLowerCase();
    const hasToxic = toxicKeywords.some(keyword => lowerContent.includes(keyword));
    
    return {
      flagged: hasToxic,
      categories: {},
      categoryScores: {},
      severity: hasToxic ? 'low' : 'none',
      recommendations: hasToxic ? ['Review content manually'] : [],
    };
  }

  parseTrendingPrediction(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Parse trending prediction error:', error);
    }
    return { topics: [], hashtags: [] };
  }

  getFallbackTrending() {
    return {
      topics: [
        { topic: 'Technology', confidence: 0.7, reason: 'Always trending' },
        { topic: 'Health & Wellness', confidence: 0.6, reason: 'Growing interest' },
      ],
      hashtags: [
        { hashtag: '#tech', confidence: 0.7, reason: 'Popular tag' },
        { hashtag: '#wellness', confidence: 0.6, reason: 'Growing tag' },
      ],
    };
  }

  parseRecommendations(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Parse recommendations error:', error);
    }
    return { recommendations: [] };
  }

  mapRecommendationsToContent(result, availableContent, limit) {
    const recommendations = result.recommendations || [];
    const contentMap = new Map(availableContent.map(c => [c._id?.toString(), c]));
    
    return recommendations
      .map(rec => ({
        content: contentMap.get(rec.contentId),
        score: rec.score || 0,
        reason: rec.reason || '',
      }))
      .filter(rec => rec.content)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(rec => rec.content);
  }

  getFallbackRecommendations(userProfile, availableContent, limit) {
    return availableContent
      .sort((a, b) => {
        const scoreA = (a.views || 0) + (a.likesCount || 0) * 100;
        const scoreB = (b.views || 0) + (b.likesCount || 0) * 100;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }
}

module.exports = new AdvancedAIService();

