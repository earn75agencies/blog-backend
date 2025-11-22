const { asyncHandler } = require('../utils/asyncHandler');
const Post = require('../models/Post.model');
const Category = require('../models/Category.model');
const Tag = require('../models/Tag.model');
const User = require('../models/User.model');

/**
 * @desc    Get sitemap
 * @route   GET /api/seo/sitemap
 * @access  Public
 */
exports.getSitemap = asyncHandler(async (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');

  // Get all published posts
  const posts = await Post.find({ 
    status: 'published',
    publishedAt: { $lte: new Date() }
  }).select('slug publishedAt updatedAt').sort({ publishedAt: -1 });

  // Get all categories
  const categories = await Category.find({}).select('slug updatedAt').sort({ createdAt: -1 });

  // Get all tags
  const tags = await Tag.find({}).select('slug updatedAt').sort({ createdAt: -1 });

  // Get all users (authors)
  const users = await User.find({ 
    isActive: true 
  }).select('username updatedAt').sort({ createdAt: -1 });

  // Build sitemap
  const sitemap = {
    posts: posts.map(post => ({
      url: `${baseUrl}/posts/${post.slug}`,
      lastmod: post.updatedAt || post.publishedAt,
      changefreq: 'weekly',
      priority: 0.8,
    })),
    categories: categories.map(category => ({
      url: `${baseUrl}/categories/${category.slug}`,
      lastmod: category.updatedAt,
      changefreq: 'monthly',
      priority: 0.6,
    })),
    tags: tags.map(tag => ({
      url: `${baseUrl}/tags/${tag.slug}`,
      lastmod: tag.updatedAt,
      changefreq: 'weekly',
      priority: 0.5,
    })),
    authors: users.map(user => ({
      url: `${baseUrl}/authors/${user.username}`,
      lastmod: user.updatedAt,
      changefreq: 'monthly',
      priority: 0.4,
    })),
  };

  res.set('Content-Type', 'application/json');
  res.json({
    status: 'success',
    data: sitemap,
  });
});

/**
 * @desc    Get robots.txt
 * @route   GET /api/seo/robots
 * @access  Public
 */
exports.getRobotsTxt = asyncHandler(async (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/api/seo/sitemap
`;

  res.set('Content-Type', 'text/plain');
  res.send(robotsTxt);
});
