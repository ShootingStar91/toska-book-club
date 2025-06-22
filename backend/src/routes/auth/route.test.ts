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

describe('Auth Routes', () => {
  describe('POST /login', () => {
    it('should return JWT token for valid credentials', async () => {
      // Create a test user in the database
      await createTestUser({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        is_admin: false,
      });

      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        id: expect.any(String),
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false
      });
      expect(typeof response.body.token).toBe('string');
      
      await app.close();
    });

    it('should return 401 for invalid credentials', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/login')
        .send({
          username: 'wronguser',
          password: 'wrongpass'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
      
      await app.close();
    });

    it('should return 400 for missing username', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/login')
        .send({
          password: 'password123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password are required');
      
      await app.close();
    });

    it('should return 400 for missing password', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/login')
        .send({
          username: 'testuser'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password are required');
      
      await app.close();
    });

    it('should return 400 for empty request body', async () => {
      const app = createTestApp();
      
      await app.ready();
      
      const response = await request(app.server)
        .post('/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password are required');
      
      await app.close();
    });
  });
});