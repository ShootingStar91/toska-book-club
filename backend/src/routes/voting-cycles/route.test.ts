import { describe, it, expect } from 'vitest';
import fastify from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { votingCyclesRoute } from './route';
import { createTestUser } from '../../test-setup';
import { errorHandler } from '../../middleware/logging';
import bcrypt from 'bcrypt';

// Helper function to create app with error handling
function createTestApp() {
  const app = fastify();
  app.setErrorHandler(errorHandler);
  app.register(votingCyclesRoute, { prefix: '/voting-cycles' });
  return app;
}

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
      
      const app = createTestApp();
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const response = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString(),
          votingMode: 'normal'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: 'suggesting',
        votingMode: 'normal',
        suggestionDeadline: expect.any(String),
        votingDeadline: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      await app.close();
    });

    it('should return 403 for non-admin user', async () => {
      const { token } = await createUserAndToken(false);
      
      const app = createTestApp();
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const response = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString(),
          votingMode: 'normal'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Admin access required');

      await app.close();
    });

    it('should return 401 without token', async () => {
      const app = createTestApp();
      await app.ready();

      const response = await request(app.server)
        .post('/voting-cycles')
        .send({
          suggestionDeadline: new Date().toISOString(),
          votingDeadline: new Date().toISOString()
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });

    it('should return 400 for missing required fields', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = createTestApp();
      await app.ready();

      const response = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing deadlines
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');

      await app.close();
    });

    it('should return 400 for past suggestion deadline', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = createTestApp();
      await app.ready();

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const response = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: yesterday.toISOString(),
          votingDeadline: tomorrow.toISOString(),
          votingMode: 'normal'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Suggestion deadline must be in the future');

      await app.close();
    });

    it('should return 409 when trying to create cycle while one is active', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = createTestApp();
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create first cycle
      await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString(),
          votingMode: 'normal'
        });

      // Try to create second cycle
      const response = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString(),
          votingMode: 'normal'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Cannot create a new voting cycle while one is still active');

      await app.close();
    });

    it('should return 400 for voting deadline before suggestion deadline', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = createTestApp();
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const today = new Date(Date.now() + 12 * 60 * 60 * 1000);

      const response = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: today.toISOString(),
          votingMode: 'normal'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Voting deadline must be after suggestion deadline');

      await app.close();
    });
  });

  describe('GET /voting-cycles', () => {
    it('should return all voting cycles for authenticated user', async () => {
      const { token } = await createUserAndToken(false);
      
      const app = createTestApp();
      await app.ready();

      const response = await request(app.server)
        .get('/voting-cycles')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      await app.close();
    });

    it('should return 401 without token', async () => {
      const app = createTestApp();
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
      
      const app = createTestApp();
      await app.ready();

      const response = await request(app.server)
        .get('/voting-cycles/current')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'No active voting cycle found');

      await app.close();
    });

    it('should return 401 without token', async () => {
      const app = createTestApp();
      await app.ready();

      const response = await request(app.server)
        .get('/voting-cycles/current');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });
  });

  describe('PUT /voting-cycles/:id', () => {
    it('should update voting cycle deadlines for admin user', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = createTestApp();
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create cycle first
      const createResponse = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString(),
          votingMode: 'normal'
        });

      const cycleId = createResponse.body.id;

      // Update deadlines
      const newSuggestionDeadline = new Date(Date.now() + 36 * 60 * 60 * 1000);
      const newVotingDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const response = await request(app.server)
        .put(`/voting-cycles/${cycleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: newSuggestionDeadline.toISOString(),
          votingDeadline: newVotingDeadline.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: cycleId,
        status: 'suggesting',
        suggestionDeadline: newSuggestionDeadline.toISOString(),
        votingDeadline: newVotingDeadline.toISOString()
      });

      await app.close();
    });

    it('should update only suggestion deadline', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = createTestApp();
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create cycle
      const createResponse = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString(),
          votingMode: 'normal'
        });

      const cycleId = createResponse.body.id;
      const originalVotingDeadline = createResponse.body.votingDeadline;

      // Update only suggestion deadline
      const newSuggestionDeadline = new Date(Date.now() + 36 * 60 * 60 * 1000);

      const response = await request(app.server)
        .put(`/voting-cycles/${cycleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: newSuggestionDeadline.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.suggestionDeadline).toBe(newSuggestionDeadline.toISOString());
      expect(response.body.votingDeadline).toBe(originalVotingDeadline);

      await app.close();
    });

    it('should return 403 for non-admin user', async () => {
      const { token: adminToken } = await createUserAndToken(true);
      const { token: userToken } = await createUserAndToken(false);
      
      const app = createTestApp();
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create cycle as admin
      const createResponse = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString(),
          votingMode: 'normal'
        });

      const cycleId = createResponse.body.id;

      // Try to update as regular user
      const response = await request(app.server)
        .put(`/voting-cycles/${cycleId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          suggestionDeadline: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Admin access required');

      await app.close();
    });

    it('should return 401 without token', async () => {
      const app = createTestApp();
      await app.ready();

      const response = await request(app.server)
        .put('/voting-cycles/some-id')
        .send({
          suggestionDeadline: new Date().toISOString()
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });

    it('should return 404 for non-existent cycle', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = createTestApp();
      await app.ready();

      const response = await request(app.server)
        .put('/voting-cycles/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Voting cycle not found');

      await app.close();
    });

    it('should allow past suggestion deadline', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = createTestApp();
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create cycle
      const createResponse = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString(),
          votingMode: 'normal'
        });

      const cycleId = createResponse.body.id;

      // Update with past deadline (should now be allowed)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const response = await request(app.server)
        .put(`/voting-cycles/${cycleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: yesterday.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.suggestionDeadline).toBe(yesterday.toISOString());

      await app.close();
    });

    it('should return 400 for voting deadline before suggestion deadline', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = createTestApp();
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create cycle
      const createResponse = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString(),
          votingMode: 'normal'
        });

      const cycleId = createResponse.body.id;

      // Try to update with invalid voting deadline
      const today = new Date(Date.now() + 12 * 60 * 60 * 1000);

      const response = await request(app.server)
        .put(`/voting-cycles/${cycleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          votingDeadline: today.toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Voting deadline must be after suggestion deadline');

      await app.close();
    });

    it('should return 400 for invalid date format', async () => {
      const { token } = await createUserAndToken(true);
      
      const app = createTestApp();
      await app.ready();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create cycle
      const createResponse = await request(app.server)
        .post('/voting-cycles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: tomorrow.toISOString(),
          votingDeadline: dayAfterTomorrow.toISOString(),
          votingMode: 'normal'
        });

      const cycleId = createResponse.body.id;

      // Try to update with invalid date format
      const response = await request(app.server)
        .put(`/voting-cycles/${cycleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          suggestionDeadline: 'invalid-date'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid suggestion deadline format');

      await app.close();
    });
  });
});