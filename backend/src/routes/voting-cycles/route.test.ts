import { describe, it, expect } from 'vitest';
import fastify from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { votingCyclesRoute } from './route';
import { createTestUser } from '../../test-setup';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

describe('Voting Cycles Routes', () => {
  async function createUserAndToken(isAdmin: boolean = false) {
    const user = await createTestUser({
      username: isAdmin ? 'adminuser' : 'testuser',
      email: isAdmin ? 'admin@example.com' : 'test@example.com',
      password_hash: await bcrypt.hash('password123', 10),
      is_admin: isAdmin,
    });

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        isAdmin: user.is_admin,
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return { user, token };
  }

  describe('POST /voting-cycles', () => {
    it('should create voting cycle for admin user', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = fastify();
      app.register(votingCyclesRoute, { prefix: '/voting-cycles' });
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const response = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Spring 2024 Selection',
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: 'Spring 2024 Selection',
        status: 'suggesting',
        suggestionDeadline: expect.any(String),
        votingDeadline: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      await app.close();
    });

    it('should return 403 for non-admin user', async () => {
      const { token } = await createUserAndToken(false);
      
      const app = fastify();
      app.register(votingCyclesRoute, { prefix: '/voting-cycles' });
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const response = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Spring 2024 Selection',
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString()
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Admin access required');

      await app.close();
    });

    it('should return 401 without token', async () => {
      const app = fastify();
      app.register(votingCyclesRoute, { prefix: '/voting-cycles' });
      await app.ready();

      const response = await request(app.server)
        .post('/voting-cycles')
        .send({
          name: 'Spring 2024 Selection',
          suggestionDeadline: new Date().toISOString(),
          votingDeadline: new Date().toISOString()
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });

    it('should return 400 for missing required fields', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = fastify();
      app.register(votingCyclesRoute, { prefix: '/voting-cycles' });
      await app.ready();

      const response = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Spring 2024 Selection'
          // Missing deadlines
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');

      await app.close();
    });

    it('should return 400 for past suggestion deadline', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = fastify();
      app.register(votingCyclesRoute, { prefix: '/voting-cycles' });
      await app.ready();

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const response = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Cycle',
          suggestionDeadline: yesterday.toISOString(),
          votingDeadline: tomorrow.toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Suggestion deadline must be in the future');

      await app.close();
    });

    it('should return 400 for voting deadline before suggestion deadline', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = fastify();
      app.register(votingCyclesRoute, { prefix: '/voting-cycles' });
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const today = new Date(Date.now() + 12 * 60 * 60 * 1000);

      const response = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Cycle',
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: today.toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Voting deadline must be after suggestion deadline');

      await app.close();
    });
  });

  describe('GET /voting-cycles', () => {
    it('should return all voting cycles for authenticated user', async () => {
      const { token } = await createUserAndToken(false);
      
      const app = fastify();
      app.register(votingCyclesRoute, { prefix: '/voting-cycles' });
      await app.ready();

      const response = await request(app.server)
        .get('/voting-cycles')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      await app.close();
    });

    it('should return 401 without token', async () => {
      const app = fastify();
      app.register(votingCyclesRoute, { prefix: '/voting-cycles' });
      await app.ready();

      const response = await request(app.server)
        .get('/voting-cycles');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });
  });

  describe('GET /voting-cycles/current', () => {
    it('should return 404 when no active cycle exists', async () => {
      const { token } = await createUserAndToken(false);
      
      const app = fastify();
      app.register(votingCyclesRoute, { prefix: '/voting-cycles' });
      await app.ready();

      const response = await request(app.server)
        .get('/voting-cycles/current')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'No active voting cycle found');

      await app.close();
    });

    it('should return 401 without token', async () => {
      const app = fastify();
      app.register(votingCyclesRoute, { prefix: '/voting-cycles' });
      await app.ready();

      const response = await request(app.server)
        .get('/voting-cycles/current');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });
  });
});