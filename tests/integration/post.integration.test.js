const request = require('supertest');
const app = require('../../server');
const Post = require('../../models/Post.model');
const User = require('../../models/User.model');
const Category = require('../../models/Category.model');
const Tag = require('../../models/Tag.model');
const { createTestUser, createTestCategory, createTestTag, createTestPost, getAuthToken } = require('../setup/testSetup');

describe('Post API Integration Tests', () => {
  let testUser;
  let testAuthor;
  let testCategory;
  let testTag;
  let authToken;
  let authorToken;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: 'user@example.com',
      username: 'testuser',
    });
    authToken = await getAuthToken(testUser);

    testAuthor = await createTestUser({
      email: 'author@example.com',
      username: 'testauthor',
      role: 'author',
    });
    authorToken = await getAuthToken(testAuthor);

    testCategory = await createTestCategory({
      name: 'Technology',
      slug: 'technology',
    });

    testTag = await createTestTag({
      name: 'javascript',
      slug: 'javascript',
    });
  });

  afterEach(async () => {
    await Post.deleteMany({});
  });

  describe('GET /api/posts', () => {
    beforeEach(async () => {
      // Create test posts
      await createTestPost(testAuthor._id, testCategory._id, {
        title: 'First Post',
        slug: 'first-post',
        status: 'published',
      });
      await createTestPost(testAuthor._id, testCategory._id, {
        title: 'Second Post',
        slug: 'second-post',
        status: 'published',
      });
      await createTestPost(testAuthor._id, testCategory._id, {
        title: 'Draft Post',
        slug: 'draft-post',
        status: 'draft',
      });
    });

    it('should get all published posts', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.posts).toBeDefined();
      expect(response.body.data.posts.length).toBe(2); // Only published posts
      expect(response.body.data.posts.every(post => post.status === 'published')).toBe(true);
    });

    it('should paginate posts correctly', async () => {
      const response = await request(app)
        .get('/api/posts?page=1&limit=1')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.posts.length).toBe(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.pagination.pages).toBe(2);
    });

    it('should filter posts by category', async () => {
      const otherCategory = await createTestCategory({
        name: 'Science',
        slug: 'science',
      });
      
      await createTestPost(testAuthor._id, otherCategory._id, {
        title: 'Science Post',
        slug: 'science-post',
        status: 'published',
      });

      const response = await request(app)
        .get(`/api/posts?category=${testCategory._id}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.posts.every(post => 
        post.category._id.toString() === testCategory._id.toString()
      )).toBe(true);
    });

    it('should filter posts by author', async () => {
      const response = await request(app)
        .get(`/api/posts?author=${testAuthor._id}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.posts.every(post => 
        post.author._id.toString() === testAuthor._id.toString()
      )).toBe(true);
    });

    it('should sort posts by publishedAt descending by default', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      const posts = response.body.data.posts;
      if (posts.length > 1) {
        const dates = posts.map(p => new Date(p.publishedAt).getTime());
        expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
      }
    });
  });

  describe('GET /api/posts/:slug', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await createTestPost(testAuthor._id, testCategory._id, {
        title: 'Single Post',
        slug: 'single-post',
        status: 'published',
      });
    });

    it('should get a single post by slug', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPost.slug}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.post).toBeDefined();
      expect(response.body.data.post.slug).toBe('single-post');
      expect(response.body.data.post.title).toBe('Single Post');
    });

    it('should increment view count when post is viewed', async () => {
      const initialViews = testPost.views;
      
      await request(app)
        .get(`/api/posts/${testPost.slug}`)
        .expect(200);

      const updatedPost = await Post.findById(testPost._id);
      expect(updatedPost.views).toBe(initialViews + 1);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/posts/non-existent-post')
        .expect(404);

      expect(response.body.status).toBe('error');
    });

    it('should not show draft posts to non-authors', async () => {
      const draftPost = await createTestPost(testAuthor._id, testCategory._id, {
        title: 'Draft Post',
        slug: 'draft-post',
        status: 'draft',
      });

      const response = await request(app)
        .get(`/api/posts/${draftPost.slug}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });

    it('should show draft posts to the author', async () => {
      const draftPost = await createTestPost(testAuthor._id, testCategory._id, {
        title: 'My Draft',
        slug: 'my-draft',
        status: 'draft',
      });

      const response = await request(app)
        .get(`/api/posts/${draftPost.slug}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(200);

      expect(response.body.data.post.status).toBe('draft');
    });
  });

  describe('POST /api/posts', () => {
    it('should create a new post as author', async () => {
      const postData = {
        title: 'New Post Title',
        excerpt: 'This is a new post excerpt',
        content: 'This is the content of the new post with enough characters to meet the minimum requirement. '.repeat(3),
        category: testCategory._id,
        status: 'draft',
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(postData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.post).toBeDefined();
      expect(response.body.data.post.title).toBe(postData.title);
      expect(response.body.data.post.slug).toBeDefined();
      expect(response.body.data.post.author._id.toString()).toBe(testAuthor._id.toString());
    });

    it('should fail to create post without authentication', async () => {
      const postData = {
        title: 'New Post',
        excerpt: 'Excerpt',
        content: 'Content '.repeat(20),
        category: testCategory._id,
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should fail to create post with invalid category', async () => {
      const postData = {
        title: 'New Post',
        excerpt: 'Excerpt',
        content: 'Content '.repeat(20),
        category: new require('mongoose').Types.ObjectId(), // Invalid category
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(postData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should fail with title too short', async () => {
      const postData = {
        title: 'Ab', // Too short
        excerpt: 'Excerpt',
        content: 'Content '.repeat(20),
        category: testCategory._id,
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(postData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('PUT /api/posts/:id', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await createTestPost(testAuthor._id, testCategory._id, {
        title: 'Post to Update',
        slug: 'post-to-update',
      });
    });

    it('should update post as author', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content '.repeat(20),
      };

      const response = await request(app)
        .put(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.post.title).toBe('Updated Title');
    });

    it('should fail to update post of another author', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.status).toBe('error');
    });

    it('should allow admin to update any post', async () => {
      const admin = await createTestUser({
        email: 'admin@example.com',
        username: 'admin',
        role: 'admin',
      });
      const adminToken = await getAuthToken(admin);

      const updateData = {
        title: 'Admin Updated Title',
      };

      const response = await request(app)
        .put(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.post.title).toBe('Admin Updated Title');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await createTestPost(testAuthor._id, testCategory._id, {
        title: 'Post to Delete',
        slug: 'post-to-delete',
      });
    });

    it('should delete post as author', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');

      // Verify post is deleted
      const deletedPost = await Post.findById(testPost._id);
      expect(deletedPost).toBeNull();
    });

    it('should fail to delete post of another author', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/posts/:id/like', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await createTestPost(testAuthor._id, testCategory._id, {
        title: 'Post to Like',
        slug: 'post-to-like',
        status: 'published',
      });
    });

    it('should like a post', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPost._id}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');

      const updatedPost = await Post.findById(testPost._id);
      expect(updatedPost.likes).toContainEqual(testUser._id);
    });

    it('should unlike a post if already liked', async () => {
      // Like first
      await request(app)
        .post(`/api/posts/${testPost._id}/like`)
        .set('Authorization', `Bearer ${authToken}`);

      // Unlike
      const response = await request(app)
        .post(`/api/posts/${testPost._id}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');

      const updatedPost = await Post.findById(testPost._id);
      expect(updatedPost.likes).not.toContainEqual(testUser._id);
    });

    it('should fail to like without authentication', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPost._id}/like`)
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });
});

