import { describe, it, expect } from 'vitest';
import { createVotingCycle, getAllVotingCycles, getCurrentVotingCycle } from './service';
import { testDb } from '../../test-database';

describe('Voting Cycles Service', () => {
  describe('createVotingCycle', () => {
    it('should create a valid voting cycle', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const result = await createVotingCycle({
        name: 'Test Cycle',
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString()
      });

      expect(result).toMatchObject({
        id: expect.any(String),
        name: 'Test Cycle',
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
      expect(dbCycle?.name).toBe('Test Cycle');
      expect(dbCycle?.status).toBe('suggesting');
    });

    it('should reject past suggestion deadline', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await expect(createVotingCycle({
        name: 'Invalid Cycle',
        suggestionDeadline: yesterday.toISOString(),
        votingDeadline: tomorrow.toISOString()
      })).rejects.toThrow('Suggestion deadline must be in the future');
    });

    it('should reject voting deadline before suggestion deadline', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const today = new Date(Date.now() + 12 * 60 * 60 * 1000);

      await expect(createVotingCycle({
        name: 'Invalid Cycle',
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: today.toISOString()
      })).rejects.toThrow('Voting deadline must be after suggestion deadline');
    });

    it('should reject duplicate names', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create first cycle
      await createVotingCycle({
        name: 'Duplicate Name',
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString()
      });

      // Try to create another with same name
      await expect(createVotingCycle({
        name: 'Duplicate Name',
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString()
      })).rejects.toThrow('A voting cycle with this name already exists');
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
        name: 'First Cycle',
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString()
      });

      await createVotingCycle({
        name: 'Second Cycle',
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString()
      });

      const result = await getAllVotingCycles();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Second Cycle'); // Most recent first
      expect(result[1].name).toBe('First Cycle');
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
        name: 'Active Cycle',
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString()
      });

      const result = await getCurrentVotingCycle();
      expect(result).toMatchObject({
        id: cycle.id,
        name: 'Active Cycle',
        status: 'suggesting'
      });
    });
  });
});