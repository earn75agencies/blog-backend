const mongoose = require('mongoose');
const User = require('../../../models/User.model');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('Validation', () => {
    it('should create a valid user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await User.create(userData);
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.password).toBeDefined();
      expect(user.isActive).toBe(true);
      expect(user.role).toBe('user');
    });

    it('should fail with missing required fields', async () => {
      const userData = {
        username: 'testuser',
        // Missing email and password
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail with invalid email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail with password too short', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '12345', // Less than 6 characters
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail with username too short', async () => {
      const userData = {
        username: 'ab', // Less than 3 characters
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail with duplicate email', async () => {
      const userData = {
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'password123',
      };

      await User.create(userData);

      const duplicateData = {
        username: 'user2',
        email: 'duplicate@example.com',
        password: 'password123',
      };

      await expect(User.create(duplicateData)).rejects.toThrow();
    });

    it('should fail with duplicate username', async () => {
      const userData = {
        username: 'duplicateuser',
        email: 'user1@example.com',
        password: 'password123',
      };

      await User.create(userData);

      const duplicateData = {
        username: 'duplicateuser',
        email: 'user2@example.com',
        password: 'password123',
      };

      await expect(User.create(duplicateData)).rejects.toThrow();
    });

    it('should lowercase email on save', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      });

      expect(user.email).toBe('test@example.com');
    });

    it('should trim username and email', async () => {
      const user = await User.create({
        username: '  testuser  ',
        email: '  test@example.com  ',
        password: 'password123',
      });

      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(user.password).not.toBe('password123');
      expect(user.password.length).toBeGreaterThan(20); // bcrypt hash length
    });

    it('should not hash password if not modified', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      const originalPassword = user.password;
      user.firstName = 'Updated';
      await user.save();

      expect(user.password).toBe(originalPassword);
    });
  });

  describe('Instance Methods', () => {
    let user;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
    });

    describe('comparePassword', () => {
      it('should return true for correct password', async () => {
        const isMatch = await user.comparePassword('password123');
        expect(isMatch).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        const isMatch = await user.comparePassword('wrongpassword');
        expect(isMatch).toBe(false);
      });
    });

    describe('generateAuthToken', () => {
      it('should generate a JWT token', () => {
        const token = user.generateAuthToken();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.').length).toBe(3); // JWT has 3 parts
      });
    });

    describe('generateEmailVerificationToken', () => {
      it('should generate email verification token', () => {
        const token = user.generateEmailVerificationToken();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(user.emailVerificationToken).toBeDefined();
      });
    });

    describe('generatePasswordResetToken', () => {
      it('should generate password reset token', () => {
        const token = user.generatePasswordResetToken();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(user.passwordResetToken).toBeDefined();
        expect(user.passwordResetExpires).toBeDefined();
        expect(user.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
      });
    });

    describe('toSafeObject', () => {
      it('should return user object without password', () => {
        const safeObject = user.toSafeObject();
        expect(safeObject.password).toBeUndefined();
        expect(safeObject.passwordResetToken).toBeUndefined();
        expect(safeObject.emailVerificationToken).toBeUndefined();
        expect(safeObject.username).toBe(user.username);
        expect(safeObject.email).toBe(user.email);
      });
    });
  });

  describe('Static Methods', () => {
    describe('findByEmailOrUsername', () => {
      it('should find user by email', async () => {
        await User.create({
          username: 'testuser',
          email: 'find@example.com',
          password: 'password123',
        });

        const user = await User.findByEmailOrUsername('find@example.com');
        expect(user).toBeDefined();
        expect(user.email).toBe('find@example.com');
      });

      it('should find user by username', async () => {
        await User.create({
          username: 'finduser',
          email: 'test@example.com',
          password: 'password123',
        });

        const user = await User.findByEmailOrUsername('finduser');
        expect(user).toBeDefined();
        expect(user.username).toBe('finduser');
      });

      it('should return null for non-existent user', async () => {
        const user = await User.findByEmailOrUsername('nonexistent');
        expect(user).toBeNull();
      });
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate fullName correctly', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(user.fullName).toBe('John Doe');
    });

    it('should return username if firstName/lastName not provided', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(user.fullName).toBe('testuser');
    });
  });
});

