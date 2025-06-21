import { describe, it, expect } from 'vitest';
import { createVotingCycle, getAllVotingCycles, getCurrentVotingCycle, updateVotingCycle } from './service';
import { testDb } from '../../test-database';

describe('Voting Cycles Service', () => {
  describe('createVotingCycle', () => {
    it('should create a valid voting cycle', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const result = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      expect(result).toMatchObject({
        id: expect.any(String),
        status: 'suggesting',
        votingMode: 'normal',
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
        votingDeadline: tomorrow.toISOString(),
        votingMode: 'normal'
      })).rejects.toThrow('Suggestion deadline must be in the future');
    });

    it('should reject voting deadline before suggestion deadline', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const today = new Date(Date.now() + 12 * 60 * 60 * 1000);

      await expect(createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: today.toISOString(),
        votingMode: 'normal'
      })).rejects.toThrow('Voting deadline must be after suggestion deadline');
    });

    it('should reject creating cycle when one is already active', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create first cycle
      await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      // Try to create second cycle while first is active
      await expect(createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      })).rejects.toThrow('Cannot create a new voting cycle while one is still active');
    });

  });

  describe('getAllVotingCycles', () => {
    it('should return empty array when no cycles exist', async () => {
      const result = await getAllVotingCycles();
      expect(result).toEqual([]);
    });

    it('should return all cycles ordered by creation date desc', async () => {
      // Create first cycle and mark it as completed so we can create a second one
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const firstCycle = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      // Mark first cycle as completed so we can create another
      await testDb
        .updateTable('voting_cycles')
        .set({ status: 'completed' })
        .where('id', '=', firstCycle.id)
        .execute();

      // Now create second cycle
      await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
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
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      const result = await getCurrentVotingCycle();
      expect(result).toMatchObject({
        id: cycle.id,
        status: 'suggesting'
      });
    });
  });

  describe('updateVotingCycle', () => {
    it('should update both deadlines successfully', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create a cycle
      const cycle = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      // Update both deadlines
      const newSuggestionDeadline = new Date(Date.now() + 36 * 60 * 60 * 1000);
      const newVotingDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const result = await updateVotingCycle(cycle.id, {
        suggestionDeadline: newSuggestionDeadline.toISOString(),
        votingDeadline: newVotingDeadline.toISOString()
      });

      expect(result).toMatchObject({
        id: cycle.id,
        status: 'suggesting',
        suggestionDeadline: newSuggestionDeadline.toISOString(),
        votingDeadline: newVotingDeadline.toISOString()
      });

      // Verify updated_at changed
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(new Date(cycle.updatedAt).getTime());
    });

    it('should update only suggestion deadline', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const cycle = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      const newSuggestionDeadline = new Date(Date.now() + 36 * 60 * 60 * 1000);

      const result = await updateVotingCycle(cycle.id, {
        suggestionDeadline: newSuggestionDeadline.toISOString()
      });

      expect(result.suggestionDeadline).toBe(newSuggestionDeadline.toISOString());
      expect(result.votingDeadline).toBe(cycle.votingDeadline); // Should remain unchanged
    });

    it('should update only voting deadline', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const cycle = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      const newVotingDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const result = await updateVotingCycle(cycle.id, {
        votingDeadline: newVotingDeadline.toISOString()
      });

      expect(result.votingDeadline).toBe(newVotingDeadline.toISOString());
      expect(result.suggestionDeadline).toBe(cycle.suggestionDeadline); // Should remain unchanged
    });

    it('should reject update for non-existent cycle', async () => {
      const newDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await expect(updateVotingCycle('550e8400-e29b-41d4-a716-446655440000', {
        suggestionDeadline: newDeadline.toISOString()
      })).rejects.toThrow('Voting cycle not found');
    });

    it('should reject update for completed cycle', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const cycle = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      // Mark cycle as completed
      await testDb
        .updateTable('voting_cycles')
        .set({ status: 'completed' })
        .where('id', '=', cycle.id)
        .execute();

      const newDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await expect(updateVotingCycle(cycle.id, {
        suggestionDeadline: newDeadline.toISOString()
      })).rejects.toThrow('Cannot edit a completed voting cycle');
    });

    it('should allow past suggestion deadline', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const cycle = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await updateVotingCycle(cycle.id, {
        suggestionDeadline: yesterday.toISOString()
      });

      expect(result.suggestionDeadline).toBe(yesterday.toISOString());
    });

    it('should reject voting deadline before suggestion deadline', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const cycle = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      const today = new Date(Date.now() + 12 * 60 * 60 * 1000);

      await expect(updateVotingCycle(cycle.id, {
        votingDeadline: today.toISOString()
      })).rejects.toThrow('Voting deadline must be after suggestion deadline');
    });

    it('should reject voting deadline before new suggestion deadline', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const cycle = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      const threeDaysFromNow = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const twoDaysFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await expect(updateVotingCycle(cycle.id, {
        suggestionDeadline: threeDaysFromNow.toISOString(),
        votingDeadline: twoDaysFromNow.toISOString()
      })).rejects.toThrow('Voting deadline must be after suggestion deadline');
    });

    it('should reject invalid date format for suggestion deadline', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const cycle = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      await expect(updateVotingCycle(cycle.id, {
        suggestionDeadline: 'invalid-date'
      })).rejects.toThrow('Invalid suggestion deadline format');
    });

    it('should reject invalid date format for voting deadline', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const cycle = await createVotingCycle({
        suggestionDeadline: tomorrow.toISOString(),
        votingDeadline: dayAfterTomorrow.toISOString(),
        votingMode: 'normal'
      });

      await expect(updateVotingCycle(cycle.id, {
        votingDeadline: 'invalid-date'
      })).rejects.toThrow('Invalid voting deadline format');
    });
  });
});