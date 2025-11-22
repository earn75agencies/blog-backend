/**
 * AI Service
 * Handles all AI-powered features including content suggestions,
 * recommendations, auto-tagging, sentiment analysis, and more
 */

const axios = require('axios');

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    this.anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1';
    this.enableAI = process.env.ENABLE_AI === 'true';
  }

  /**
   * Generate content suggestions for authors
   * @param {Object} userData - User's writing history and preferences
   * @param {Object} trendingData - Current trending topics
   * @returns {Promise<Array>} Array of content suggestions
   */
  async generateContentSuggestions(userData, trendingData = {}) {
    if (!this.enableAI) {
      return this.getFallbackSuggestions(userData, trendingData);
    }

    try {
      const prompt = `Based on this author's writing history and current trends, suggest 5 engaging blog post topics:
      
Author Profile:
- Categories written: ${userData.categories?.join(', ') || 'General'}
- Average post length: ${userData.avgPostLength || 'Medium'}
- Popular topics: ${userData.popularTopics?.join(', ') || 'Various'}
- Target audience: ${userData.targetAudience || 'General public'}

Current Trends: ${JSON.stringify(trendingData)}

Suggest 5 specific, engaging blog post titles with brief descriptions (2-3 sentences each).`;

      const response = await this.callOpenAI(prompt, 500);
      return this.parseContentSuggestions(response);
    } catch (error) {
      console.error('AI Content Suggestions Error:', error);
      return this.getFallbackSuggestions(userData, trendingData);
    }
  }

  /**
   * Generate smart content recommendations for readers
   * @param {Object} userProfile - User's reading history and preferences
   * @param {Array} availableContent - Available posts to recommend
   * @param {Number} limit - Number of recommendations
   * @returns {Promise<Array>} Recommended content
   */
  async generateRecommendations(userProfile, availableContent = [], limit = 10) {
    if (!this.enableAI || availableContent.length === 0) {
      return this.getFallbackRecommendations(userProfile, availableContent, limit);
    }

    try {
      // Use collaborative filtering + AI for better recommendations
      const userPreferences = {
        categories: userProfile.readCategories || [],
        tags: userProfile.readTags || [],
        authors: userProfile.followedAuthors || [],
        readingTime: userProfile.avgReadingTime || 5,
      };

      // Score content based on user preferences
      const scoredContent = availableContent.map(content => {
        let score = 0;
        
        // Category match
        if (userPreferences.categories.includes(content.category?.name)) {
          score += 3;
        }
        
        // Tag matches
        const tagMatches = content.tags?.filter(tag => 
          userPreferences.tags.includes(tag.name)
        ).length || 0;
        score += tagMatches * 2;
        
        // Author match
        if (userPreferences.authors.includes(content.author?._id?.toString())) {
          score += 2;
        }
        
        // Popularity boost
        score += (content.views || 0) / 1000;
        score += (content.likesCount || 0) * 0.5;
        
        return { content, score };
      });

      // Sort by score and return top recommendations
      return scoredContent
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.content);
    } catch (error) {
      console.error('AI Recommendations Error:', error);
      return this.getFallbackRecommendations(userProfile, availableContent, limit);
    }
  }

  /**
   * Automatically detect and tag content
   * @param {String} title - Post title
   * @param {String} content - Post content
   * @param {String} excerpt - Post excerpt
   * @returns {Promise<Object>} Detected tags and category
   */
  async autoTagContent(title, content, excerpt) {
    if (!this.enableAI) {
      return this.getFallbackTags(title, content, excerpt);
    }

    try {
      const prompt = `Analyze this blog post and provide:
1. Primary category (one word/phrase)
2. Relevant tags (5-10 tags, comma-separated)
3. Keywords (5-7 keywords, comma-separated)

Title: ${title}
Excerpt: ${excerpt}
Content (first 500 chars): ${content.substring(0, 500)}...

Respond in JSON format:
{
  "category": "category name",
  "tags": ["tag1", "tag2", ...],
  "keywords": ["keyword1", "keyword2", ...]
}`;

      const response = await this.callOpenAI(prompt, 300);
      return this.parseTagResponse(response);
    } catch (error) {
      console.error('AI Auto-tagging Error:', error);
      return this.getFallbackTags(title, content, excerpt);
    }
  }

  /**
   * Analyze sentiment of content or comments
   * @param {String} text - Text to analyze
   * @returns {Promise<Object>} Sentiment analysis result
   */
  async analyzeSentiment(text) {
    if (!this.enableAI) {
      return this.getFallbackSentiment(text);
    }

    try {
      const prompt = `Analyze the sentiment of this text. Respond with JSON:
{
  "sentiment": "positive|negative|neutral",
  "score": 0.0-1.0,
  "emotions": ["emotion1", "emotion2"],
  "summary": "brief summary"
}

Text: ${text.substring(0, 1000)}`;

      const response = await this.callOpenAI(prompt, 200);
      return this.parseSentimentResponse(response);
    } catch (error) {
      console.error('AI Sentiment Analysis Error:', error);
      return this.getFallbackSentiment(text);
    }
  }

  /**
   * Generate SEO-optimized title and description
   * @param {String} title - Original title
   * @param {String} content - Post content
   * @returns {Promise<Object>} SEO-optimized metadata
   */
  async generateSEOContent(title, content) {
    if (!this.enableAI) {
      return {
        seoTitle: title.substring(0, 60),
        seoDescription: content.substring(0, 160),
        seoKeywords: [],
      };
    }

    try {
      const prompt = `Generate SEO-optimized metadata for this blog post:

Title: ${title}
Content: ${content.substring(0, 1000)}...

Provide:
1. SEO title (max 60 chars)
2. Meta description (max 160 chars)
3. Keywords (5-7 keywords, comma-separated)

Respond in JSON format:
{
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": ["keyword1", "keyword2", ...]
}`;

      const response = await this.callOpenAI(prompt, 250);
      return this.parseSEOResponse(response);
    } catch (error) {
      console.error('AI SEO Generation Error:', error);
      return {
        seoTitle: title.substring(0, 60),
        seoDescription: content.substring(0, 160),
        seoKeywords: [],
      };
    }
  }

  /**
   * Moderate content using AI
   * @param {String} content - Content to moderate
   * @param {String} type - Content type (post, comment, etc.)
   * @returns {Promise<Object>} Moderation result
   */
  async moderateContent(content, type = 'post') {
    if (!this.enableAI) {
      return { approved: true, flags: [], reason: null };
    }

    try {
      const prompt = `Moderate this ${type} content. Check for:
- Spam
- Hate speech
- Inappropriate content
- Misinformation
- Copyright concerns

Content: ${content.substring(0, 2000)}...

Respond in JSON:
{
  "approved": true|false,
  "flags": ["flag1", "flag2"],
  "reason": "reason if not approved",
  "confidence": 0.0-1.0
}`;

      const response = await this.callOpenAI(prompt, 200);
      return this.parseModerationResponse(response);
    } catch (error) {
      console.error('AI Content Moderation Error:', error);
      return { approved: true, flags: [], reason: null, confidence: 0.5 };
    }
  }

  /**
   * Generate personalized dashboard content
   * @param {Object} userProfile - User profile and behavior data
   * @returns {Promise<Object>} Personalized dashboard configuration
   */
  async generatePersonalizedDashboard(userProfile) {
    const recommendations = await this.generateRecommendations(userProfile, [], 6);
    const suggestions = await this.generateContentSuggestions(userProfile, {});
    
    return {
      recommendedContent: recommendations,
      contentSuggestions: suggestions,
      trendingTopics: userProfile.trendingTopics || [],
      yourStats: {
        postsPublished: userProfile.postsCount || 0,
        totalViews: userProfile.totalViews || 0,
        followersCount: userProfile.followersCount || 0,
      },
      quickActions: this.generateQuickActions(userProfile),
    };
  }

  // Helper Methods

  async callOpenAI(prompt, maxTokens = 500) {
    try {
      const response = await axios.post(
        `${this.openaiBaseUrl}/chat/completions`,
        {
          model: process.env.OPENAI_MODEL || 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a helpful AI assistant for a blog platform.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI API Error:', error.message);
      throw error;
    }
  }

  parseContentSuggestions(response) {
    try {
      const lines = response.split('\n').filter(line => line.trim());
      const suggestions = [];

      lines.forEach(line => {
        if (line.match(/^\d+\./)) {
          const clean = line.replace(/^\d+\.\s*/, '').trim();
          const [title, ...descriptionParts] = clean.split(':');
          suggestions.push({
            title: title.trim(),
            description: descriptionParts.join(':').trim(),
          });
        }
      });

      return suggestions.slice(0, 5);
    } catch (error) {
      return this.getFallbackSuggestions({}, {});
    }
  }

  parseTagResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Parse tag response error:', error);
    }
    return { category: null, tags: [], keywords: [] };
  }

  parseSentimentResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Parse sentiment response error:', error);
    }
    return { sentiment: 'neutral', score: 0.5, emotions: [], summary: '' };
  }

  parseSEOResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Parse SEO response error:', error);
    }
    return { seoTitle: '', seoDescription: '', seoKeywords: [] };
  }

  parseModerationResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Parse moderation response error:', error);
    }
    return { approved: true, flags: [], reason: null, confidence: 0.5 };
  }

  // Fallback methods when AI is disabled or fails

  getFallbackSuggestions(userData, trendingData) {
    return [
      {
        title: 'Getting Started with Blogging',
        description: 'A beginner-friendly guide to starting your blogging journey.',
      },
      {
        title: 'Content Creation Tips',
        description: 'Learn how to create engaging content that resonates with your audience.',
      },
      {
        title: 'Growing Your Audience',
        description: 'Strategies to build and grow your blog audience effectively.',
      },
    ];
  }

  getFallbackRecommendations(userProfile, availableContent, limit) {
    // Simple recommendation based on user's reading history
    return availableContent
      .sort((a, b) => {
        // Sort by views and likes
        const scoreA = (a.views || 0) + (a.likesCount || 0) * 100;
        const scoreB = (b.views || 0) + (b.likesCount || 0) * 100;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  getFallbackTags(title, content, excerpt) {
    // Extract basic keywords from title and content
    const text = `${title} ${excerpt} ${content.substring(0, 200)}`;
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordFreq = {};
    
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const sortedWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return {
      category: null,
      tags: sortedWords.slice(0, 5),
      keywords: sortedWords.slice(0, 7),
    };
  }

  getFallbackSentiment(text) {
    // Simple sentiment analysis based on keywords
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'happy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointing', 'sad', 'angry'];
    
    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });

    let sentiment = 'neutral';
    let score = 0.5;

    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      score = 0.5 + (positiveCount / 10);
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      score = 0.5 - (negativeCount / 10);
    }

    return {
      sentiment,
      score: Math.max(0, Math.min(1, score)),
      emotions: [],
      summary: '',
    };
  }

  generateQuickActions(userProfile) {
    const actions = [];
    
    if (userProfile.role === 'author' || userProfile.role === 'admin') {
      actions.push({ label: 'Create New Post', action: '/create-post', icon: 'write' });
    }
    
    actions.push(
      { label: 'Browse Posts', action: '/posts', icon: 'browse' },
      { label: 'Your Bookmarks', action: '/bookmarks', icon: 'bookmark' },
      { label: 'Settings', action: '/settings', icon: 'settings' }
    );

    return actions;
  }
}

module.exports = new AIService();

