const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User.model');
const { createTestUser, getAuthToken } = require('../setup/testSetup');

describe('Auth API Integration Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Test user will be created in individual tests
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be in response
    });

    it('should fail to register with duplicate email', async () => {
      // Create existing user
      await createTestUser({
        email: 'existing@example.com',
        username: 'existing',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'existing@example.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already exists');
    });

    it('should fail to register with duplicate username', async () => {
      await createTestUser({
        email: 'user1@example.com',
        username: 'existinguser',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: 'newemail@example.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should fail with password too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: '12345', // Less than 6 characters
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should fail with username too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab', // Less than 3 characters
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'loginuser@example.com',
        username: 'loginuser',
        password: 'password123',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe('loginuser@example.com');
    });

    it('should login with username instead of email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser', // username
          password: 'password123',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.token).toBeDefined();
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should fail with deactivated account', async () => {
      testUser.isActive = false;
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('deactivated');
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'me@example.com',
        username: 'meuser',
      });
      authToken = await getAuthToken(testUser);
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('me@example.com');
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      testUser = await createTestUser();
      authToken = await getAuthToken(testUser);
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'forgot@example.com',
        username: 'forgotuser',
      });
    });

    it('should send password reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@example.com' })
        .expect(200);

      expect(response.body.status).toBe('success');
      
      // Verify reset token was created
      const user = await User.findById(testUser._id).select('+passwordResetToken');
      expect(user.passwordResetToken).toBeDefined();
    });

    it('should not reveal if email does not exist (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200); // Should still return 200 for security

      expect(response.body.status).toBe('success');
    });
  });
});

