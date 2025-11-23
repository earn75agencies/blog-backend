/**
 * Pinecone Service - Vector Database for Semantic Search
 * Handles vector storage and similarity search
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const { pinecone: config } = require('../../config/ai.config');
const openaiService = require('./openai.service');

class PineconeService {
  constructor() {
    this.client = null;
    this.index = null;
    this.initialized = false;
    
    if (!config.apiKey) {
      console.warn('⚠️  Pinecone API key not configured');
      return;
    }
    
    this.initialize();
  }

  /**
   * Initialize Pinecone client
   */
  async initialize() {
    try {
      this.client = new Pinecone({ 
        apiKey: config.apiKey,
      });
      
      // Get or create index
      const indexList = await this.client.listIndexes();
      const indexExists = indexList.indexes?.some(idx => idx.name === config.indexName);
      
      if (!indexExists) {
        console.log('📝 Creating Pinecone index...');
        await this.client.createIndex({
          name: config.indexName,
          dimension: config.dimension,
          metric: config.metric,
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        console.log('✅ Pinecone index created');
        
        // Wait for index to be ready
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      this.index = this.client.index(config.indexName);
      this.initialized = true;
      
      console.log('✅ Pinecone service initialized');
    } catch (error) {
      console.error('❌ Pinecone initialization error:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return this.initialized && this.index !== null && openaiService.isAvailable();
  }

  /**
   * Upsert post into vector database
   */
  async upsertPost(post) {
    if (!this.isAvailable()) {
      console.warn('Pinecone service not available, skipping upsert');
      return;
    }

    try {
      // Generate embedding from post content
      const textToEmbed = `${post.title} ${post.excerpt} ${post.content.substring(0, 2000)}`;
      const embedding = await openaiService.generateEmbedding(textToEmbed);

      // Prepare metadata (must be flat key-value pairs)
      const metadata = {
        postId: post._id.toString(),
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ? post.excerpt.substring(0, 200) : '',
        categoryId: post.category?._id?.toString() || '',
        categoryName: post.category?.name || '',
        authorId: post.author?._id?.toString() || '',
        status: post.status || 'published',
        publishedAt: post.publishedAt ? new Date(post.publishedAt).getTime() : Date.now(),
        views: post.views || 0,
        likesCount: post.likesCount || 0,
      };

      // Add tags as comma-separated string (Pinecone doesn't support arrays in metadata)
      if (post.tags && post.tags.length > 0) {
        metadata.tags = post.tags.map(t => t.name || t).join(',');
      }

      // Upsert to Pinecone
      await this.index.upsert([{
        id: post._id.toString(),
        values: embedding,
        metadata,
      }]);

      console.log(`✅ Post ${post._id} indexed in Pinecone`);
    } catch (error) {
      console.error(`Failed to upsert post ${post._id}:`, error.message);
      throw error;
    }
  }

  /**
   * Semantic search for posts
   */
  async semanticSearch(query, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Pinecone service not available');
    }

    const {
      limit = 10,
      filter = {},
      includeMetadata = true,
    } = options;

    try {
      // Generate embedding for search query
      const queryEmbedding = await openaiService.generateEmbedding(query);
      
      // Build filter (only published posts by default)
      const searchFilter = {
        status: { $eq: 'published' },
        ...filter,
      };

      // Search Pinecone
      const results = await this.index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata,
        filter: searchFilter,
      });

      return results.matches.map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
      }));
    } catch (error) {
      console.error('Semantic search error:', error.message);
      throw new Error(`Semantic search failed: ${error.message}`);
    }
  }

  /**
   * Get recommendations for a post
   */
  async getRecommendations(postId, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Pinecone service not available');
    }

    const {
      limit = 5,
      filter = {},
    } = options;

    try {
      // Fetch the post vector by ID
      const fetchResult = await this.index.fetch([postId.toString()]);
      const postVector = fetchResult.records[postId.toString()];
      
      if (!postVector) {
        throw new Error('Post not found in vector database');
      }

      // Search for similar posts
      const results = await this.index.query({
        vector: postVector.values,
        topK: limit + 1, // +1 to exclude the post itself
        includeMetadata: true,
        filter: {
          status: { $eq: 'published' },
          postId: { $ne: postId.toString() }, // Exclude the current post
          ...filter,
        },
      });

      return results.matches
        .filter(match => match.id !== postId.toString())
        .slice(0, limit)
        .map(match => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata,
        }));
    } catch (error) {
      console.error('Get recommendations error:', error.message);
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }

  /**
   * Delete post from vector database
   */
  async deletePost(postId) {
    if (!this.isAvailable()) {
      console.warn('Pinecone service not available, skipping delete');
      return;
    }

    try {
      await this.index.deleteOne(postId.toString());
      console.log(`✅ Post ${postId} removed from Pinecone`);
    } catch (error) {
      console.error(`Failed to delete post ${postId}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete multiple posts
   */
  async deletePosts(postIds) {
    if (!this.isAvailable()) {
      console.warn('Pinecone service not available, skipping bulk delete');
      return;
    }

    try {
      await this.index.deleteMany(postIds.map(id => id.toString()));
      console.log(`✅ Deleted ${postIds.length} posts from Pinecone`);
    } catch (error) {
      console.error('Failed to delete posts:', error.message);
      throw error;
    }
  }

  /**
   * Get index stats
   */
  async getStats() {
    if (!this.isAvailable()) {
      throw new Error('Pinecone service not available');
    }

    try {
      const stats = await this.index.describeIndexStats();
      return {
        totalVectors: stats.totalRecordCount || 0,
        dimension: stats.dimension,
        indexFullness: stats.indexFullness,
      };
    } catch (error) {
      console.error('Failed to get stats:', error.message);
      throw error;
    }
  }

  /**
   * Bulk upsert posts (for initial indexing or re-indexing)
   */
  async bulkUpsertPosts(posts, batchSize = 100) {
    if (!this.isAvailable()) {
      throw new Error('Pinecone service not available');
    }

    console.log(`📝 Bulk upserting ${posts.length} posts to Pinecone...`);
    let successCount = 0;
    let errorCount = 0;

    // Process in batches
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      
      try {
        await Promise.all(
          batch.map(post => this.upsertPost(post).catch(err => {
            console.error(`Failed to upsert post ${post._id}:`, err.message);
            errorCount++;
          }))
        );
        
        successCount += batch.length - errorCount;
        console.log(`✅ Progress: ${Math.min(i + batchSize, posts.length)}/${posts.length}`);
        
        // Rate limiting delay
        if (i + batchSize < posts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Batch upsert error:', error.message);
      }
    }

    console.log(`✅ Bulk upsert complete: ${successCount} success, ${errorCount} errors`);
    
    return {
      total: posts.length,
      success: successCount,
      errors: errorCount,
    };
  }
}

// Export singleton instance
module.exports = new PineconeService();