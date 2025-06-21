import { describe, it, expect } from 'vitest';
import fastify from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { bookSuggestionsRoute } from './route';
import { createTestUser } from '../../test-setup';
import { testDb } from '../../test-database';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

describe('Book Suggestions Routes', () => {
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

  async function createVotingCycle(status: 'suggesting' | 'voting' | 'completed' = 'suggesting') {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

    return await testDb
      .insertInto('voting_cycles')
      .values({
        suggestion_deadline: tomorrow,
        voting_deadline: dayAfterTomorrow,
        status,
        voting_mode: 'normal',
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  describe('POST /book-suggestions', () => {
    it('should create book suggestion during suggesting phase', async () => {
      const { token } = await createUserAndToken();
      await createVotingCycle('suggesting');
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .post('/book-suggestions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          year: 1925,
          pageCount: 180,
          link: 'https://example.com/book',
          miscInfo: 'Classic American literature'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        year: 1925,
        pageCount: 180,
        link: 'https://example.com/book',
        miscInfo: 'Classic American literature',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      await app.close();
    });

    it('should create book suggestion with only required fields', async () => {
      const { token } = await createUserAndToken();
      await createVotingCycle('suggesting');
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .post('/book-suggestions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Simple Book',
          author: 'Simple Author'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'Simple Book',
        author: 'Simple Author',
        year: null,
        pageCount: null,
        link: null,
        miscInfo: null
      });

      await app.close();
    });

    it('should return 401 without token', async () => {
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .post('/book-suggestions')
        .send({
          title: 'Some Book',
          author: 'Some Author'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });

    it('should return 400 for missing title', async () => {
      const { token } = await createUserAndToken();
      await createVotingCycle('suggesting');
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .post('/book-suggestions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          author: 'Some Author'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Title and author are required');

      await app.close();
    });

    it('should return 400 for missing author', async () => {
      const { token } = await createUserAndToken();
      await createVotingCycle('suggesting');
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .post('/book-suggestions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Some Book'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Title and author are required');

      await app.close();
    });

    it('should return 404 when no active voting cycle exists', async () => {
      const { token } = await createUserAndToken();
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .post('/book-suggestions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Some Book',
          author: 'Some Author'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'No active voting cycle found');

      await app.close();
    });

    it('should return 403 during voting phase', async () => {
      const { token } = await createUserAndToken();
      await createVotingCycle('voting');
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .post('/book-suggestions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Some Book',
          author: 'Some Author'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Book suggestions are only allowed during the suggesting phase');

      await app.close();
    });

    it('should return 403 when suggestion deadline has passed', async () => {
      const { token } = await createUserAndToken();
      
      // Create a cycle with past suggestion deadline
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await testDb
        .insertInto('voting_cycles')
        .values({
          suggestion_deadline: yesterday,
          voting_deadline: tomorrow,
          status: 'suggesting',
        })
        .execute();
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .post('/book-suggestions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Some Book',
          author: 'Some Author'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Suggestion deadline has passed');

      await app.close();
    });

    it('should return 409 when user already has a suggestion for the cycle', async () => {
      const { user, token } = await createUserAndToken();
      const cycle = await createVotingCycle('suggesting');
      
      // Create existing suggestion
      await testDb
        .insertInto('book_suggestions')
        .values({
          user_id: user.id,
          voting_cycle_id: cycle.id,
          title: 'Existing Book',
          author: 'Existing Author',
        })
        .execute();
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .post('/book-suggestions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Book',
          author: 'New Author'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'You can only suggest one book per voting cycle');

      await app.close();
    });
  });

  describe('GET /book-suggestions/cycle/:cycleId', () => {
    it('should return all suggestions for a cycle', async () => {
      const { user, token } = await createUserAndToken();
      const cycle = await createVotingCycle('suggesting');
      
      // Create a suggestion
      await testDb
        .insertInto('book_suggestions')
        .values({
          user_id: user.id,
          voting_cycle_id: cycle.id,
          title: 'Test Book',
          author: 'Test Author',
        })
        .execute();
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .get(`/book-suggestions/cycle/${cycle.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        title: 'Test Book',
        author: 'Test Author'
      });

      await app.close();
    });

    it('should return 401 without token', async () => {
      const cycle = await createVotingCycle('suggesting');
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .get(`/book-suggestions/cycle/${cycle.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });
  });

  describe('GET /book-suggestions/my/:cycleId', () => {
    it('should return user\'s suggestion for a cycle', async () => {
      const { user, token } = await createUserAndToken();
      const cycle = await createVotingCycle('suggesting');
      
      // Create user's suggestion
      await testDb
        .insertInto('book_suggestions')
        .values({
          user_id: user.id,
          voting_cycle_id: cycle.id,
          title: 'My Book',
          author: 'My Author',
        })
        .execute();
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .get(`/book-suggestions/my/${cycle.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        title: 'My Book',
        author: 'My Author',
        userId: user.id
      });

      await app.close();
    });

    it('should return 404 when user has no suggestion for cycle', async () => {
      const { token } = await createUserAndToken();
      const cycle = await createVotingCycle('suggesting');
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .get(`/book-suggestions/my/${cycle.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'No suggestion found for this cycle');

      await app.close();
    });

    it('should return 401 without token', async () => {
      const cycle = await createVotingCycle('suggesting');
      
      const app = fastify();
      app.register(bookSuggestionsRoute, { prefix: '/book-suggestions' });
      await app.ready();

      const response = await request(app.server)
        .get(`/book-suggestions/my/${cycle.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });
  });
});