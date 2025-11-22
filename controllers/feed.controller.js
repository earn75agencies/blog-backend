const { asyncHandler } = require('../utils/asyncHandler');
const Post = require('../models/Post.model');
const Category = require('../models/Category.model');
const User = require('../models/User.model');
const RSS = require('rss');

/**
 * @desc    Generate RSS feed
 * @route   GET /api/feeds/rss
 * @access  Public
 */
exports.getRSSFeed = asyncHandler(async (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const siteName = process.env.SITE_NAME || 'Gidix';
  const siteDescription = process.env.SITE_DESCRIPTION || 'Gidix Blogging Platform';

  // Create RSS feed
  const feed = new RSS({
    title: siteName,
    description: siteDescription,
    feed_url: `${baseUrl}/api/feeds/rss`,
    site_url: baseUrl,
    image_url: `${baseUrl}/logo.png`,
    managingEditor: process.env.ADMIN_EMAIL || 'admin@gidix.com',
    webMaster: process.env.ADMIN_EMAIL || 'admin@gidix.com',
    copyright: `Copyright ${new Date().getFullYear()} ${siteName}`,
    language: 'en',
    pubDate: new Date(),
    ttl: 60, // Time to live in minutes
  });

  // Get published posts
  const posts = await Post.find({
    status: 'published',
    publishedAt: { $lte: new Date() },
  })
    .populate('author', 'username firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .sort({ publishedAt: -1 })
    .limit(50)
    .lean();

  // Add posts to feed
  posts.forEach((post) => {
    const postUrl = `${baseUrl}/post/${post.slug}`;
    const authorName = post.author
      ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || post.author.username
      : 'Unknown';

    feed.item({
      title: post.title,
      description: post.excerpt || post.content.substring(0, 500),
      url: postUrl,
      guid: postUrl,
      author: authorName,
      date: post.publishedAt || post.createdAt,
      categories: [
        ...(post.category ? [post.category.name] : []),
        ...(post.tags ? post.tags.map((tag) => tag.name) : []),
      ],
      enclosure: post.featuredImage
        ? {
            url: post.featuredImage,
            type: 'image/jpeg',
          }
        : undefined,
    });
  });

  // Set content type and send
  res.set('Content-Type', 'application/rss+xml');
  res.send(feed.xml({ indent: true }));
});

/**
 * @desc    Generate RSS feed for category
 * @route   GET /api/feeds/rss/category/:slug
 * @access  Public
 */
exports.getCategoryRSSFeed = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const baseUrl = req.protocol + '://' + req.get('host');

  const category = await Category.findOne({ slug, isActive: true });
  if (!category) {
    return res.status(404).json({
      status: 'error',
      message: 'Category not found',
    });
  }

  const siteName = process.env.SITE_NAME || 'Gidix';
  const feed = new RSS({
    title: `${siteName} - ${category.name}`,
    description: category.description || `${category.name} posts from ${siteName}`,
    feed_url: `${baseUrl}/api/feeds/rss/category/${slug}`,
    site_url: `${baseUrl}/category/${slug}`,
    language: 'en',
    pubDate: new Date(),
    ttl: 60,
  });

  const posts = await Post.find({
    status: 'published',
    publishedAt: { $lte: new Date() },
    category: category._id,
  })
    .populate('author', 'username firstName lastName')
    .populate('tags', 'name slug')
    .sort({ publishedAt: -1 })
    .limit(50)
    .lean();

  posts.forEach((post) => {
    const postUrl = `${baseUrl}/post/${post.slug}`;
    const authorName = post.author
      ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || post.author.username
      : 'Unknown';

    feed.item({
      title: post.title,
      description: post.excerpt || post.content.substring(0, 500),
      url: postUrl,
      guid: postUrl,
      author: authorName,
      date: post.publishedAt || post.createdAt,
      categories: post.tags ? post.tags.map((tag) => tag.name) : [],
      enclosure: post.featuredImage
        ? {
            url: post.featuredImage,
            type: 'image/jpeg',
          }
        : undefined,
    });
  });

  res.set('Content-Type', 'application/rss+xml');
  res.send(feed.xml({ indent: true }));
});

/**
 * @desc    Generate RSS feed for author
 * @route   GET /api/feeds/rss/author/:username
 * @access  Public
 */
exports.getAuthorRSSFeed = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const baseUrl = req.protocol + '://' + req.get('host');

  const author = await User.findOne({ username, isActive: true });
  if (!author) {
    return res.status(404).json({
      status: 'error',
      message: 'Author not found',
    });
  }

  const siteName = process.env.SITE_NAME || 'Gidix';
  const authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.username;

  const feed = new RSS({
    title: `${siteName} - ${authorName}`,
    description: `Posts by ${authorName} on ${siteName}`,
    feed_url: `${baseUrl}/api/feeds/rss/author/${username}`,
    site_url: `${baseUrl}/author/${username}`,
    language: 'en',
    pubDate: new Date(),
    ttl: 60,
  });

  const posts = await Post.find({
    status: 'published',
    publishedAt: { $lte: new Date() },
    author: author._id,
  })
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .sort({ publishedAt: -1 })
    .limit(50)
    .lean();

  posts.forEach((post) => {
    const postUrl = `${baseUrl}/post/${post.slug}`;

    feed.item({
      title: post.title,
      description: post.excerpt || post.content.substring(0, 500),
      url: postUrl,
      guid: postUrl,
      author: authorName,
      date: post.publishedAt || post.createdAt,
      categories: [
        ...(post.category ? [post.category.name] : []),
        ...(post.tags ? post.tags.map((tag) => tag.name) : []),
      ],
      enclosure: post.featuredImage
        ? {
            url: post.featuredImage,
            type: 'image/jpeg',
          }
        : undefined,
    });
  });

  res.set('Content-Type', 'application/rss+xml');
  res.send(feed.xml({ indent: true }));
});

/**
 * @desc    Generate Atom feed
 * @route   GET /api/feeds/atom
 * @access  Public
 */
exports.getAtomFeed = asyncHandler(async (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const siteName = process.env.SITE_NAME || 'Gidix';
  const siteDescription = process.env.SITE_DESCRIPTION || 'Gidix Blogging Platform';

  const feed = new RSS({
    title: siteName,
    description: siteDescription,
    feed_url: `${baseUrl}/api/feeds/atom`,
    site_url: baseUrl,
    language: 'en',
    pubDate: new Date(),
  });

  const posts = await Post.find({
    status: 'published',
    publishedAt: { $lte: new Date() },
  })
    .populate('author', 'username firstName lastName')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .sort({ publishedAt: -1 })
    .limit(50)
    .lean();

  posts.forEach((post) => {
    const postUrl = `${baseUrl}/post/${post.slug}`;
    const authorName = post.author
      ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || post.author.username
      : 'Unknown';

    feed.item({
      title: post.title,
      description: post.excerpt || post.content.substring(0, 500),
      url: postUrl,
      guid: postUrl,
      author: authorName,
      date: post.publishedAt || post.createdAt,
      categories: [
        ...(post.category ? [post.category.name] : []),
        ...(post.tags ? post.tags.map((tag) => tag.name) : []),
      ],
    });
  });

  res.set('Content-Type', 'application/atom+xml');
  res.send(feed.xml({ indent: true }));
});

