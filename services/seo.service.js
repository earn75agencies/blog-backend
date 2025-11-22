const Post = require('../models/Post.model');
const Category = require('../models/Category.model');
const Tag = require('../models/Tag.model');
const { stripHtml, truncate } = require('../utils/string.util');

/**
 * SEO service
 * Handles SEO optimization for posts and pages
 */
class SEOService {
  /**
   * Generate meta tags for post
   * @param {Object} post - Post object
   * @returns {Object} Meta tags
   */
  generatePostMetaTags(post) {
    const title = post.seoTitle || post.title;
    const description = post.seoDescription || stripHtml(post.excerpt);
    const keywords = post.seoKeywords && post.seoKeywords.length > 0
      ? post.seoKeywords.join(', ')
      : post.tags.map(tag => tag.name).join(', ');

    return {
      title: truncate(title, 60),
      description: truncate(description, 160),
      keywords: keywords,
      ogTitle: title,
      ogDescription: description,
      ogImage: post.featuredImage || null,
      ogType: 'article',
      ogUrl: `/post/${post.slug}`,
      twitterCard: 'summary_large_image',
      twitterTitle: title,
      twitterDescription: description,
      twitterImage: post.featuredImage || null,
      articleAuthor: post.author.username,
      articlePublishedTime: post.publishedAt || post.createdAt,
      articleModifiedTime: post.updatedAt,
      articleSection: post.category.name,
      articleTag: post.tags.map(tag => tag.name),
    };
  }

  /**
   * Generate sitemap data
   * @returns {Promise<Object>} Sitemap data
   */
  async generateSitemap() {
    const [posts, categories, tags] = await Promise.all([
      Post.find({ status: 'published', publishedAt: { $lte: new Date() } })
        .select('slug updatedAt')
        .sort({ updatedAt: -1 })
        .lean(),
      Category.find({ isActive: true })
        .select('slug updatedAt')
        .lean(),
      Tag.find()
        .select('slug updatedAt')
        .limit(100)
        .lean(),
    ]);

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const urls = [
      { url: baseUrl, changefreq: 'daily', priority: 1.0 },
      { url: `${baseUrl}/posts`, changefreq: 'daily', priority: 0.9 },
      { url: `${baseUrl}/categories`, changefreq: 'weekly', priority: 0.8 },
      { url: `${baseUrl}/tags`, changefreq: 'weekly', priority: 0.8 },
    ];

    // Add post URLs
    posts.forEach(post => {
      urls.push({
        url: `${baseUrl}/post/${post.slug}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: post.updatedAt,
      });
    });

    // Add category URLs
    categories.forEach(category => {
      urls.push({
        url: `${baseUrl}/category/${category.slug}`,
        changefreq: 'weekly',
        priority: 0.6,
        lastmod: category.updatedAt,
      });
    });

    // Add tag URLs
    tags.forEach(tag => {
      urls.push({
        url: `${baseUrl}/tag/${tag.slug}`,
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: tag.updatedAt,
      });
    });

    return urls;
  }

  /**
   * Generate robots.txt content
   * @returns {string} Robots.txt content
   */
  generateRobotsTxt() {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /profile/
Disallow: /settings/

Sitemap: ${baseUrl}/sitemap.xml`;
  }

  /**
   * Generate structured data (JSON-LD) for post
   * @param {Object} post - Post object
   * @returns {Object} Structured data
   */
  generatePostStructuredData(post) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      image: post.featuredImage ? [post.featuredImage] : [],
      datePublished: post.publishedAt || post.createdAt,
      dateModified: post.updatedAt,
      author: {
        '@type': 'Person',
        name: post.author.username,
        url: `${baseUrl}/author/${post.author.username}`,
      },
      publisher: {
        '@type': 'Organization',
        name: process.env.SITE_NAME || 'Gidi Blog',
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/logo.png`,
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${baseUrl}/post/${post.slug}`,
      },
      articleSection: post.category.name,
      keywords: post.tags.map(tag => tag.name).join(', '),
    };
  }
}

module.exports = new SEOService();

