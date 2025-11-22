/**
 * Search Indexer Service
 * Indexes posts to Elasticsearch/OpenSearch
 * Falls back to MongoDB text search if ES unavailable
 */

const { Client } = require('@elastic/elasticsearch');
const Post = require('../../models/Post.model');
const { addJob } = require('../queue/queue.service');

class SearchIndexerService {
  constructor() {
    // Initialize Elasticsearch client (optional)
    this.esClient = null;
    this.esEnabled = process.env.ELASTICSEARCH_ENABLED === 'true';
    
    if (this.esEnabled) {
      try {
        this.esClient = new Client({
          node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
          auth: {
            username: process.env.ELASTICSEARCH_USERNAME || '',
            password: process.env.ELASTICSEARCH_PASSWORD || '',
          },
        });
        console.log('✅ Elasticsearch client initialized');
      } catch (error) {
        console.warn('⚠️  Elasticsearch initialization failed, using MongoDB fallback');
        this.esEnabled = false;
      }
    }
  }

  /**
   * Index a single post
   */
  async indexPost(postId) {
    try {
      const post = await Post.findById(postId)
        .populate('author', 'username firstName lastName')
        .populate('category', 'name slug')
        .populate('tags', 'name slug')
        .lean();

      if (!post || post.status !== 'published') {
        return { success: false, reason: 'Post not found or not published' };
      }

      if (this.esEnabled && this.esClient) {
        // Index to Elasticsearch
        await this.esClient.index({
          index: 'posts',
          id: post._id.toString(),
          body: {
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            slug: post.slug,
            author: {
              id: post.author._id.toString(),
              username: post.author.username,
              name: `${post.author.firstName} ${post.author.lastName}`,
            },
            category: {
              id: post.category._id.toString(),
              name: post.category.name,
              slug: post.category.slug,
            },
            tags: post.tags.map(t => ({ name: t.name, slug: t.slug })),
            publishedAt: post.publishedAt,
            views: post.views || 0,
            likes: post.likes?.length || 0,
            rankingScore: post.rankingScore || 0,
            createdAt: post.createdAt,
          },
        });

        return { success: true, engine: 'elasticsearch' };
      } else {
        // MongoDB text search (fallback)
        // Post is already in MongoDB, text index handles search
        return { success: true, engine: 'mongodb' };
      }
    } catch (error) {
      console.error('Search indexer error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove post from index
   */
  async removePost(postId) {
    try {
      if (this.esEnabled && this.esClient) {
        await this.esClient.delete({
          index: 'posts',
          id: postId.toString(),
        });
        return { success: true };
      }
      return { success: true, engine: 'mongodb' };
    } catch (error) {
      console.error('Search remover error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk index posts
   */
  async bulkIndexPosts(postIds) {
    try {
      const posts = await Post.find({ _id: { $in: postIds }, status: 'published' })
        .populate('author', 'username firstName lastName')
        .populate('category', 'name slug')
        .populate('tags', 'name slug')
        .lean();

      if (this.esEnabled && this.esClient) {
        const body = posts.flatMap(post => [
          { index: { _index: 'posts', _id: post._id.toString() } },
          {
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            slug: post.slug,
            author: {
              id: post.author._id.toString(),
              username: post.author.username,
            },
            category: {
              id: post.category._id.toString(),
              name: post.category.name,
            },
            tags: post.tags.map(t => t.name),
            publishedAt: post.publishedAt,
            views: post.views || 0,
            rankingScore: post.rankingScore || 0,
          },
        ]);

        await this.esClient.bulk({ body });
        return { success: true, indexed: posts.length };
      }

      return { success: true, indexed: posts.length, engine: 'mongodb' };
    } catch (error) {
      console.error('Bulk index error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search posts
   */
  async searchPosts(query, options = {}) {
    const {
      limit = 20,
      offset = 0,
      category,
      tags,
      author,
    } = options;

    try {
      if (this.esEnabled && this.esClient) {
        // Elasticsearch query
        const esQuery = {
          index: 'posts',
          body: {
            query: {
              bool: {
                must: [
                  {
                    multi_match: {
                      query,
                      fields: ['title^3', 'excerpt^2', 'content'],
                      type: 'best_fields',
                    },
                  },
                ],
                filter: [],
              },
            },
            sort: [{ rankingScore: { order: 'desc' } }, { publishedAt: { order: 'desc' } }],
            from: offset,
            size: limit,
          },
        };

        if (category) {
          esQuery.body.query.bool.filter.push({ term: { 'category.id': category } });
        }

        if (tags && tags.length > 0) {
          esQuery.body.query.bool.filter.push({
            terms: { 'tags.name': tags },
          });
        }

        if (author) {
          esQuery.body.query.bool.filter.push({ term: { 'author.id': author } });
        }

        const result = await this.esClient.search(esQuery);
        
        return {
          posts: result.body.hits.hits.map(hit => hit._source),
          total: result.body.hits.total.value,
          engine: 'elasticsearch',
        };
      } else {
        // MongoDB text search fallback
        const mongoQuery = {
          $text: { $search: query },
          status: 'published',
          publishedAt: { $lte: new Date() },
        };

        if (category) mongoQuery.category = category;
        if (tags) mongoQuery.tags = { $in: tags };
        if (author) mongoQuery.author = author;

        const posts = await Post.find(mongoQuery)
          .populate('author', 'username avatar firstName lastName')
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean();

        const total = await Post.countDocuments(mongoQuery);

        return {
          posts,
          total,
          engine: 'mongodb',
        };
      }
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Initialize Elasticsearch index
   */
  async initializeIndex() {
    if (!this.esEnabled || !this.esClient) {
      return { success: false, message: 'Elasticsearch not enabled' };
    }

    try {
      const exists = await this.esClient.indices.exists({ index: 'posts' });
      
      if (!exists) {
        await this.esClient.indices.create({
          index: 'posts',
          body: {
            mappings: {
              properties: {
                title: { type: 'text', analyzer: 'standard' },
                excerpt: { type: 'text', analyzer: 'standard' },
                content: { type: 'text', analyzer: 'standard' },
                slug: { type: 'keyword' },
                author: {
                  properties: {
                    id: { type: 'keyword' },
                    username: { type: 'keyword' },
                    name: { type: 'text' },
                  },
                },
                category: {
                  properties: {
                    id: { type: 'keyword' },
                    name: { type: 'text' },
                    slug: { type: 'keyword' },
                  },
                },
                tags: {
                  properties: {
                    name: { type: 'text' },
                    slug: { type: 'keyword' },
                  },
                },
                publishedAt: { type: 'date' },
                views: { type: 'integer' },
                rankingScore: { type: 'float' },
              },
            },
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Index initialization error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SearchIndexerService();



