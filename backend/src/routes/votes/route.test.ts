import { describe, it, expect } from 'vitest';
import fastify from 'fastify';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { votesRoute } from './route';
import { createTestUser } from '../../test-setup';
import { testDb } from '../../test-database';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

describe('Votes Routes', () => {
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

  async function createVotingCycle(status: 'suggesting' | 'voting' | 'completed' = 'voting') {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

    return await testDb
      .insertInto('voting_cycles')
      .values({
        suggestion_deadline: tomorrow,
        voting_deadline: dayAfterTomorrow,
        status,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async function createBookSuggestion(userId: string, cycleId: string, title: string = 'Test Book', author: string = 'Test Author') {
    return await testDb
      .insertInto('book_suggestions')
      .values({
        user_id: userId,
        voting_cycle_id: cycleId,
        title,
        author,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  describe('POST /votes', () => {
    it('should submit votes during voting phase', async () => {
      const { user, token } = await createUserAndToken();
      const user2 = await createTestUser({
        username: 'user2',
        email: 'user2@example.com',
        password_hash: await bcrypt.hash('password123', 10),
      });
      const cycle = await createVotingCycle('voting');
      const suggestion1 = await createBookSuggestion(user.id, cycle.id, 'Book 1');
      const suggestion2 = await createBookSuggestion(user2.id, cycle.id, 'Book 2');
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .post('/votes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookSuggestionIds: [suggestion1.id, suggestion2.id]
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        id: expect.any(String),
        userId: user.id,
        votingCycleId: cycle.id,
        bookSuggestionId: suggestion1.id,
        createdAt: expect.any(String)
      });

      await app.close();
    });

    it('should allow submitting empty vote list (voting for no books)', async () => {
      const { user, token } = await createUserAndToken();
      const cycle = await createVotingCycle('voting');
      await createBookSuggestion(user.id, cycle.id);
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .post('/votes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookSuggestionIds: []
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);

      await app.close();
    });

    it('should replace existing votes when submitting new ones', async () => {
      const { user, token } = await createUserAndToken();
      const user2 = await createTestUser({
        username: 'user2b',
        email: 'user2b@example.com',
        password_hash: await bcrypt.hash('password123', 10),
      });
      const user3 = await createTestUser({
        username: 'user3b',
        email: 'user3b@example.com',
        password_hash: await bcrypt.hash('password123', 10),
      });
      const cycle = await createVotingCycle('voting');
      const suggestion1 = await createBookSuggestion(user.id, cycle.id, 'Book 1');
      const suggestion2 = await createBookSuggestion(user2.id, cycle.id, 'Book 2');
      const suggestion3 = await createBookSuggestion(user3.id, cycle.id, 'Book 3');
      
      // Create initial votes
      await testDb
        .insertInto('votes')
        .values([
          { user_id: user.id, voting_cycle_id: cycle.id, book_suggestion_id: suggestion1.id },
          { user_id: user.id, voting_cycle_id: cycle.id, book_suggestion_id: suggestion2.id }
        ])
        .execute();
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      // Submit new votes (only suggestion2 and suggestion3)
      const response = await request(app.server)
        .post('/votes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookSuggestionIds: [suggestion2.id, suggestion3.id]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      // Verify old votes were replaced
      const allUserVotes = await testDb
        .selectFrom('votes')
        .selectAll()
        .where('user_id', '=', user.id)
        .where('voting_cycle_id', '=', cycle.id)
        .execute();

      expect(allUserVotes).toHaveLength(2);
      const votedSuggestionIds = allUserVotes.map(v => v.book_suggestion_id);
      expect(votedSuggestionIds).toContain(suggestion2.id);
      expect(votedSuggestionIds).toContain(suggestion3.id);
      expect(votedSuggestionIds).not.toContain(suggestion1.id);

      await app.close();
    });

    it('should return 401 without token', async () => {
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .post('/votes')
        .send({
          bookSuggestionIds: []
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });

    it('should return 404 when no active voting cycle exists', async () => {
      const { token } = await createUserAndToken();
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .post('/votes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookSuggestionIds: []
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'No active voting cycle found');

      await app.close();
    });

    it('should return 403 during suggesting phase', async () => {
      const { user, token } = await createUserAndToken();
      const cycle = await createVotingCycle('suggesting');
      const suggestion = await createBookSuggestion(user.id, cycle.id);
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .post('/votes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookSuggestionIds: [suggestion.id]
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Voting is only allowed during the voting phase');

      await app.close();
    });

    it('should return 403 when voting deadline has passed', async () => {
      const { user, token } = await createUserAndToken();
      
      // Create a cycle with past voting deadline
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      const cycle = await testDb
        .insertInto('voting_cycles')
        .values({
          suggestion_deadline: twoDaysAgo,
          voting_deadline: yesterday,
          status: 'voting',
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      
      const suggestion = await createBookSuggestion(user.id, cycle.id);
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .post('/votes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookSuggestionIds: [suggestion.id]
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Voting deadline has passed');

      await app.close();
    });

    it('should return 400 for invalid book suggestion IDs', async () => {
      const { token } = await createUserAndToken();
      await createVotingCycle('voting');
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .post('/votes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookSuggestionIds: ['invalid-id', 'another-invalid-id']
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'One or more book suggestions are invalid or not part of the current voting cycle');

      await app.close();
    });

    it('should return 400 for book suggestions from different cycle', async () => {
      const { user, token } = await createUserAndToken();
      
      // Create two cycles
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const cycle1 = await testDb
        .insertInto('voting_cycles')
        .values({
          suggestion_deadline: tomorrow,
          voting_deadline: dayAfterTomorrow,
          status: 'voting',
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const cycle2 = await testDb
        .insertInto('voting_cycles')
        .values({
          suggestion_deadline: tomorrow,
          voting_deadline: dayAfterTomorrow,
          status: 'voting',
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      
      // Create suggestion in cycle1 but try to vote in cycle2 context
      const suggestion = await createBookSuggestion(user.id, cycle1.id);
      
      // Update cycle2 to be the "current" one by updating its created_at
      await testDb
        .updateTable('voting_cycles')
        .set({ created_at: new Date() })
        .where('id', '=', cycle2.id)
        .execute();
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .post('/votes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookSuggestionIds: [suggestion.id]
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'One or more book suggestions are invalid or not part of the current voting cycle');

      await app.close();
    });
  });

  describe('GET /votes/my/:cycleId', () => {
    it('should return user\'s votes for a cycle', async () => {
      const { user, token } = await createUserAndToken();
      const user2 = await createTestUser({
        username: 'user2c',
        email: 'user2c@example.com',
        password_hash: await bcrypt.hash('password123', 10),
      });
      const cycle = await createVotingCycle('voting');
      const suggestion1 = await createBookSuggestion(user.id, cycle.id, 'Book 1');
      const suggestion2 = await createBookSuggestion(user2.id, cycle.id, 'Book 2');
      
      // Create votes
      await testDb
        .insertInto('votes')
        .values([
          { user_id: user.id, voting_cycle_id: cycle.id, book_suggestion_id: suggestion1.id },
          { user_id: user.id, voting_cycle_id: cycle.id, book_suggestion_id: suggestion2.id }
        ])
        .execute();
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .get(`/votes/my/${cycle.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        userId: user.id,
        votingCycleId: cycle.id
      });

      await app.close();
    });

    it('should return empty array when user has no votes', async () => {
      const { token } = await createUserAndToken();
      const cycle = await createVotingCycle('voting');
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .get(`/votes/my/${cycle.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);

      await app.close();
    });

    it('should return 401 without token', async () => {
      const cycle = await createVotingCycle('voting');
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .get(`/votes/my/${cycle.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });
  });

  describe('GET /votes/results/:cycleId', () => {
    it('should return vote results for completed cycle', async () => {
      const { user, token } = await createUserAndToken();
      const user2 = await createTestUser({
        username: 'user2',
        email: 'user2@example.com',
        password_hash: await bcrypt.hash('password123', 10),
      });
      
      const cycle = await createVotingCycle('completed');
      const suggestion1 = await createBookSuggestion(user.id, cycle.id, 'Popular Book');
      const suggestion2 = await createBookSuggestion(user2.id, cycle.id, 'Less Popular Book');
      
      // Create votes (suggestion1 gets 2 votes, suggestion2 gets 1 vote)
      await testDb
        .insertInto('votes')
        .values([
          { user_id: user.id, voting_cycle_id: cycle.id, book_suggestion_id: suggestion1.id },
          { user_id: user2.id, voting_cycle_id: cycle.id, book_suggestion_id: suggestion1.id },
          { user_id: user2.id, voting_cycle_id: cycle.id, book_suggestion_id: suggestion2.id }
        ])
        .execute();
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .get(`/votes/results/${cycle.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      
      // Results should be ordered by vote count desc
      expect(response.body[0]).toMatchObject({
        bookSuggestionId: suggestion1.id,
        title: 'Popular Book',
        author: 'Test Author',
        voteCount: 2
      });
      expect(response.body[1]).toMatchObject({
        bookSuggestionId: suggestion2.id,
        title: 'Less Popular Book',
        author: 'Test Author',
        voteCount: 1
      });

      await app.close();
    });

    it('should return 403 for non-completed cycle', async () => {
      const { token } = await createUserAndToken();
      const cycle = await createVotingCycle('voting');
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .get(`/votes/results/${cycle.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Vote results are only available for completed cycles');

      await app.close();
    });

    it('should return 404 for non-existent cycle', async () => {
      const { token } = await createUserAndToken();
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .get('/votes/results/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Voting cycle not found');

      await app.close();
    });

    it('should return 401 without token', async () => {
      const cycle = await createVotingCycle('completed');
      
      const app = fastify();
      app.register(votesRoute, { prefix: '/votes' });
      await app.ready();

      const response = await request(app.server)
        .get(`/votes/results/${cycle.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');

      await app.close();
    });
  });
});