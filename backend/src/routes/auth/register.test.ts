import { describe, it, expect } from 'vitest';
import fastify from 'fastify';
import request from 'supertest';
import { authRoute } from './route';
import { createTestUser } from '../../test-setup';
import { errorHandler } from '../../middleware/logging';
import bcrypt from 'bcrypt';

// Helper function to create app with error handling
function createTestApp() {
  const app = fastify();
  app.setErrorHandler(errorHandler);
  app.register(authRoute);
  return app;
}

describe('User Registration', () => {
  describe('POST /register', () => {
    it('should return 201 for successful user creation', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/register')
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'newuser@example.com',
          secret: 'valid-secret'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        message: 'User created successfully'
      });
      
      await app.close();
    });

    it('should return 400 for missing username', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/register')
        .send({
          password: 'password123',
          email: 'test@example.com',
          secret: 'valid-secret'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username, password, email, and secret are required');
      
      await app.close();
    });

    it('should return 400 for missing password', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          secret: 'valid-secret'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username, password, email, and secret are required');
      
      await app.close();
    });

    it('should return 400 for missing email', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/register')
        .send({
          username: 'testuser',
          password: 'password123',
          secret: 'valid-secret'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username, password, email, and secret are required');
      
      await app.close();
    });

    it('should return 400 for missing secret', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/register')
        .send({
          username: 'testuser',
          password: 'password123',
          email: 'test@example.com'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username, password, email, and secret are required');
      
      await app.close();
    });

    it('should return 400 for invalid email format', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/register')
        .send({
          username: 'testuser',
          password: 'password123',
          email: 'invalid-email',
          secret: 'valid-secret'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid email format');
      
      await app.close();
    });

    it('should return 403 for invalid secret', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/register')
        .send({
          username: 'testuser',
          password: 'password123',
          email: 'test@example.com',
          secret: 'wrong-secret'
        });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Invalid registration secret');
      
      await app.close();
    });

    it('should return 409 for existing username', async () => {
      // Create an existing user in the database
      await createTestUser({
        username: 'existinguser',
        email: 'different@example.com',
        password_hash: await bcrypt.hash('somepassword', 10),
      });

      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/register')
        .send({
          username: 'existinguser',
          password: 'password123',
          email: 'newemail@example.com',
          secret: 'valid-secret'
        });
      
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Username already exists');
      
      await app.close();
    });

    it('should return 409 for existing email', async () => {
      // Create an existing user in the database
      await createTestUser({
        username: 'existinguser2',
        email: 'existing@example.com',
        password_hash: await bcrypt.hash('somepassword', 10),
      });

      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/register')
        .send({
          username: 'newuser2',
          password: 'password123',
          email: 'existing@example.com',
          secret: 'valid-secret'
        });
      
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Email already exists');
      
      await app.close();
    });

    it('should return 400 for weak password', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/register')
        .send({
          username: 'testuser',
          password: '123',
          email: 'test@example.com',
          secret: 'valid-secret'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password must be at least 6 characters long');
      
      await app.close();
    });

    it('should return 400 for empty request body', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/register')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username, password, email, and secret are required');
      
      await app.close();
    });
  });
});