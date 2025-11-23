/**
 * AI Services Configuration
 * All API keys and settings for AI integrations
 */

module.exports = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
    embeddingModel: 'text-embedding-3-small', // Cheaper option
    maxTokens: 2000,
    temperature: 0.7,
  },
  
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
    indexName: process.env.PINECONE_INDEX_NAME || 'gidix-posts',
    dimension: 1536, // for text-embedding-3-small
    metric: 'cosine',
  },
  
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // Default voice
    model: 'eleven_multilingual_v2',
  },
  
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-sonnet-20240229',
  },
  
  // AI Feature Flags
  features: {
    semanticSearch: process.env.ENABLE_SEMANTIC_SEARCH !== 'false',
    recommendations: process.env.ENABLE_AI_RECOMMENDATIONS !== 'false',
    contentSuggestions: process.env.ENABLE_CONTENT_SUGGESTIONS !== 'false',
    seoOptimization: process.env.ENABLE_SEO_OPTIMIZATION !== 'false',
    sentimentAnalysis: process.env.ENABLE_SENTIMENT_ANALYSIS !== 'false',
    moderation: process.env.ENABLE_AI_MODERATION !== 'false',
    viralityPrediction: process.env.ENABLE_VIRALITY_PREDICTION !== 'false',
    podcastGeneration: process.env.ENABLE_PODCAST_GENERATION !== 'false',
  },
  
  // Rate limits (requests per minute)
  rateLimits: {
    openai: 60,
    pinecone: 100,
    elevenlabs: 20,
  },
  
  // Caching settings
  cache: {
    ttl: 3600, // 1 hour in seconds
    enabled: process.env.ENABLE_AI_CACHE !== 'false',
  },
};