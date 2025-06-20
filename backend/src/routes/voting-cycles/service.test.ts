import { describe, it, expect } from 'vitest';
import { createVotingCycle, getAllVotingCycles, getCurrentVotingCycle } from './service';
import { testDb } from '../../test-database';

describe('Voting Cycles Service', () => {
  describe('createVotingCycle', () => {
    it('should create a valid voting cycle', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const result = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString()
      });

      expect(result).toMatchObject({
        id: expect.any(String),
        status: 'suggesting',
        suggestionDeadline: expect.any(String),
        votingDeadline: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      // Verify it was actually created in database
      const dbCycle = await testDb
        .selectFrom('voting_cycles')
        .selectAll()
        .where('id', '=', result.id)
        .executeTakeFirst();

      expect(dbCycle).toBeDefined();
      expect(dbCycle?.status).toBe('suggesting');
    });

    it('should reject past suggestion deadline', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await expect(createVotingCycle({
        suggestionDeadline: yesterday.toISOString(),
        votingDeadline: tomorrow.toISOString()
      })).rejects.toThrow('Suggestion deadline must be in the future');
    });

    it('should reject voting deadline before suggestion deadline', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const today = new Date(Date.now() + 12 * 60 * 60 * 1000);

      await expect(createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: today.toISOString()
      })).rejects.toThrow('Voting deadline must be after suggestion deadline');
    });

  });

  describe('getAllVotingCycles', () => {
    it('should return empty array when no cycles exist', async () => {
      const result = await getAllVotingCycles();
      expect(result).toEqual([]);
    });

    it('should return all cycles ordered by creation date desc', async () => {
      // Create two cycles
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString()
      });

      await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString()
      });

      const result = await getAllVotingCycles();
      expect(result).toHaveLength(2);
      // Most recent first (ordered by created_at desc)
      expect(new Date(result[0].createdAt).getTime()).toBeGreaterThan(new Date(result[1].createdAt).getTime());
    });
  });

  describe('getCurrentVotingCycle', () => {
    it('should return null when no active cycles exist', async () => {
      const result = await getCurrentVotingCycle();
      expect(result).toBeNull();
    });

    it('should return active cycle', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const cycle = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString()
      });

      const result = await getCurrentVotingCycle();
      expect(result).toMatchObject({
        id: cycle.id,
        status: 'suggesting'
      });
    });
  });
});