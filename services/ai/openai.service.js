/**
 * OpenAI Service - GPT-4 Integration
 * Handles all OpenAI API interactions
 */

const OpenAI = require('openai');
const { openai: config } = require('../../config/ai.config');

class OpenAIService {
  constructor() {
    if (!config.apiKey) {
      console.warn('⚠️  OpenAI API key not configured');
      this.client = null;
      return;
    }
    
    this.client = new OpenAI({ 
      apiKey: config.apiKey,
      timeout: 30000, // 30 seconds
      maxRetries: 2,
    });
    
    console.log('✅ OpenAI service initialized');
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return this.client !== null;
  }

  /**
   * Generate text embedding for semantic search
   */
  async generateEmbedding(text) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service not configured');
    }

    try {
      const response = await this.client.embeddings.create({
        model: config.embeddingModel,
        input: text.substring(0, 8000), // Limit input length
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error.message);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate content with GPT-4
   */
  async generateContent(prompt, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service not configured');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: options.model || config.model,
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a helpful assistant for a blogging platform.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || config.maxTokens,
        temperature: options.temperature || config.temperature,
        response_format: options.json ? { type: 'json_object' } : undefined,
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI generation error:', error.message);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  /**
   * Optimize content for SEO
   */
  async optimizeSEO(title, content, targetKeywords = []) {
    const keywordsStr = targetKeywords.length > 0 
      ? `Keywords to target: ${targetKeywords.join(', ')}`
      : 'Generate relevant keywords';

    const prompt = `Analyze this blog post and optimize it for SEO:

Title: ${title}

Content: ${content.substring(0, 3000)}

${keywordsStr}

Return a JSON object with:
{
  "optimizedTitle": "SEO-friendly title (50-60 chars)",
  "metaDescription": "Compelling meta description (150-160 chars)",
  "keywords": ["keyword1", "keyword2", ...],
  "lsiKeywords": ["related1", "related2", ...],
  "suggestedHeadings": ["H2 suggestion 1", "H2 suggestion 2"],
  "recommendations": ["tip1", "tip2", ...]
}`;

    const response = await this.generateContent(prompt, { 
      json: true,
      systemPrompt: 'You are an expert SEO consultant. Return only valid JSON.'
    });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse SEO response:', error);
      throw new Error('Invalid SEO optimization response');
    }
  }

  /**
   * Analyze content sentiment
   */
  async analyzeSentiment(text) {
    const prompt = `Analyze the sentiment and emotional tone of this text:

"${text.substring(0, 2000)}"

Return a JSON object with:
{
  "score": 0-100 (where 0=very negative, 50=neutral, 100=very positive),
  "sentiment": "positive" | "neutral" | "negative",
  "emotions": ["emotion1", "emotion2"],
  "toxicity": 0-100,
  "confidence": 0-100
}`;

    const response = await this.generateContent(prompt, { 
      json: true,
      systemPrompt: 'You are a sentiment analysis expert. Return only valid JSON.'
    });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse sentiment response:', error);
      throw new Error('Invalid sentiment analysis response');
    }
  }

  /**
   * Moderate content for safety
   */
  async moderateContent(text) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service not configured');
    }

    try {
      const moderation = await this.client.moderations.create({
        input: text.substring(0, 2000),
      });
      
      const result = moderation.results[0];
      
      return {
        flagged: result.flagged,
        categories: result.categories,
        categoryScores: result.category_scores,
        safe: !result.flagged,
      };
    } catch (error) {
      console.error('OpenAI moderation error:', error.message);
      throw new Error(`Failed to moderate content: ${error.message}`);
    }
  }

  /**
   * Predict content virality
   */
  async predictVirality(post) {
    const prompt = `Analyze this blog post for virality potential:

Title: ${post.title}
Excerpt: ${post.excerpt}
Category: ${post.category?.name || 'Uncategorized'}
Tags: ${post.tags?.map(t => t.name).join(', ') || 'None'}
Content Preview: ${post.content.substring(0, 500)}

Return a JSON object with:
{
  "viralityScore": 0-100,
  "factors": ["factor1", "factor2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "estimatedReach": "low" | "medium" | "high" | "viral"
}`;

    const response = await this.generateContent(prompt, { 
      json: true,
      systemPrompt: 'You are a viral content expert. Analyze engagement potential. Return only valid JSON.'
    });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse virality response:', error);
      throw new Error('Invalid virality prediction response');
    }
  }

  /**
   * Generate content suggestions
   */
  async generateSuggestions(context) {
    const { recentPosts = [], trendingTags = [], category = '', userInterests = [] } = context;

    const prompt = `Generate 5 unique content ideas for a blog in the "${category}" category.

Recent successful posts:
${recentPosts.slice(0, 5).join('\n- ')}

Trending topics: ${trendingTags.slice(0, 10).join(', ')}
User interests: ${userInterests.join(', ')}

Return a JSON array of 5 suggestions:
[
  {
    "title": "Engaging title",
    "description": "Brief description",
    "keywords": ["keyword1", "keyword2"],
    "difficulty": "easy" | "medium" | "hard",
    "estimatedReadTime": 5-15 (minutes)
  }
]`;

    const response = await this.generateContent(prompt, { 
      json: true,
      systemPrompt: 'You are a content strategist. Generate diverse, actionable ideas. Return only valid JSON array.'
    });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse suggestions response:', error);
      throw new Error('Invalid content suggestions response');
    }
  }

  /**
   * Auto-tag content
   */
  async autoTag(title, content, excerpt) {
    const prompt = `Analyze this blog post and suggest relevant tags:

Title: ${title}
Excerpt: ${excerpt}
Content: ${content.substring(0, 2000)}

Return a JSON object with:
{
  "tags": ["tag1", "tag2", "tag3"],
  "categories": ["category1", "category2"],
  "confidence": 0-100
}

Focus on specific, searchable tags (not generic ones).`;

    const response = await this.generateContent(prompt, { 
      json: true,
      systemPrompt: 'You are a content categorization expert. Return only valid JSON.'
    });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse auto-tag response:', error);
      throw new Error('Invalid auto-tag response');
    }
  }

  /**
   * Generate personalized recommendations
   */
  async generatePersonalizedRecommendations(userProfile, availablePosts) {
    const prompt = `Based on this user's reading history and preferences, rank these posts by relevance:

User Profile:
- Favorite categories: ${userProfile.readCategories?.join(', ') || 'Unknown'}
- Favorite tags: ${userProfile.readTags?.slice(0, 10).join(', ') || 'Unknown'}
- Reading level: ${userProfile.avgReadingTime || 5} min articles

Available Posts (${availablePosts.length}):
${availablePosts.slice(0, 20).map((p, i) => 
  `${i + 1}. "${p.title}" - ${p.category?.name} - [${p.tags?.map(t => t.name).join(', ')}]`
).join('\n')}

Return a JSON object with:
{
  "recommendedPostIds": [post indices in order of relevance],
  "reasoning": "Brief explanation of recommendations"
}`;

    const response = await this.generateContent(prompt, { 
      json: true,
      systemPrompt: 'You are a personalization expert. Return only valid JSON.',
      maxTokens: 1000,
    });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse recommendations response:', error);
      throw new Error('Invalid recommendations response');
    }
  }
}

// Export singleton instance
module.exports = new OpenAIService();