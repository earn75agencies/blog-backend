const mongoose = require('mongoose');

// Use in-memory MongoDB if mongodb-memory-server is available, otherwise use test DB
let mongoServer;
let useMemoryServer = false;

try {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  useMemoryServer = true;
} catch (e) {
  // mongodb-memory-server not installed, will use regular test DB
  console.warn('mongodb-memory-server not found, using test database connection');
}

/**
 * Setup test database before all tests
 */
beforeAll(async () => {
  if (useMemoryServer) {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } else {
    // Use test database from environment or default
    const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/gidi-blog-test';
    await mongoose.connect(testDbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

/**
 * Clear all collections after each test
 */
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

/**
 * Close database connection after all tests
 */
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

/**
 * Test helper: Create a test user
 */
async function createTestUser(overrides = {}) {
  const User = require('../../models/User.model');
  const bcrypt = require('bcryptjs');

  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: await bcrypt.hash('password123', 10),
    firstName: 'Test',
    lastName: 'User',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    ...overrides,
  };

  return await User.create(defaultUser);
}

/**
 * Test helper: Create a test category
 */
async function createTestCategory(overrides = {}) {
  const Category = require('../../models/Category.model');

  const defaultCategory = {
    name: 'Test Category',
    slug: 'test-category',
    description: 'Test category description',
    isActive: true,
    ...overrides,
  };

  return await Category.create(defaultCategory);
}

/**
 * Test helper: Create a test tag
 */
async function createTestTag(overrides = {}) {
  const Tag = require('../../models/Tag.model');

  const defaultTag = {
    name: 'test-tag',
    slug: 'test-tag',
    usageCount: 0,
    ...overrides,
  };

  return await Tag.create(defaultTag);
}

/**
 * Test helper: Create a test post
 */
async function createTestPost(authorId, categoryId, overrides = {}) {
  const Post = require('../../models/Post.model');

  const defaultPost = {
    title: 'Test Post Title',
    slug: 'test-post-title',
    excerpt: 'This is a test post excerpt',
    content: 'This is a test post content with enough characters to meet the minimum requirement. '.repeat(3),
    author: authorId,
    category: categoryId,
    status: 'published',
    publishedAt: new Date(),
    readingTime: 5,
    ...overrides,
  };

  return await Post.create(defaultPost);
}

/**
 * Test helper: Get auth token for a user
 */
async function getAuthToken(user) {
  const User = require('../../models/User.model');
  const userDoc = user instanceof User ? user : await User.findById(user);
  return userDoc.generateAuthToken();
}

/**
 * Test helper: Create authenticated request headers
 */
async function getAuthHeaders(user) {
  const token = await getAuthToken(user);
  return {
    Authorization: `Bearer ${token}`,
  };
}

module.exports = {
  createTestUser,
  createTestCategory,
  createTestTag,
  createTestPost,
  getAuthToken,
  getAuthHeaders,
};

