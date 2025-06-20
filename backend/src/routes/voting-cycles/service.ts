import { db } from '../../database';
import { NewVotingCycle } from '../../database';

export interface CreateVotingCycleRequest {
  suggestionDeadline: string; // ISO date string
  votingDeadline: string; // ISO date string
}

export interface VotingCycleResponse {
  id: string;
  suggestionDeadline: string;
  votingDeadline: string;
  status: 'suggesting' | 'voting' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export async function createVotingCycle(data: CreateVotingCycleRequest): Promise<VotingCycleResponse> {
  const { suggestionDeadline, votingDeadline } = data;

  // Validate required fields
  if (!suggestionDeadline || !votingDeadline) {
    throw new Error('Suggestion deadline and voting deadline are required');
  }

  // Parse and validate dates
  const suggestionDate = new Date(suggestionDeadline);
  const votingDate = new Date(votingDeadline);
  const now = new Date();

  if (isNaN(suggestionDate.getTime())) {
    throw new Error('Invalid suggestion deadline format');
  }

  if (isNaN(votingDate.getTime())) {
    throw new Error('Invalid voting deadline format');
  }

  if (suggestionDate <= now) {
    throw new Error('Suggestion deadline must be in the future');
  }

  if (votingDate <= suggestionDate) {
    throw new Error('Voting deadline must be after suggestion deadline');
  }

  // Create the voting cycle
  const newCycle: NewVotingCycle = {
    suggestion_deadline: suggestionDate,
    voting_deadline: votingDate,
    status: 'suggesting',
  };

  const createdCycle = await db
    .insertInto('voting_cycles')
    .values(newCycle)
    .returningAll()
    .executeTakeFirstOrThrow();

  return {
    id: createdCycle.id,
    suggestionDeadline: createdCycle.suggestion_deadline.toISOString(),
    votingDeadline: createdCycle.voting_deadline.toISOString(),
    status: createdCycle.status,
    createdAt: createdCycle.created_at.toISOString(),
    updatedAt: createdCycle.updated_at.toISOString(),
  };
}

export async function getAllVotingCycles(): Promise<VotingCycleResponse[]> {
  const cycles = await db
    .selectFrom('voting_cycles')
    .selectAll()
    .orderBy('created_at', 'desc')
    .execute();

  return cycles.map(cycle => ({
    id: cycle.id,
    suggestionDeadline: cycle.suggestion_deadline.toISOString(),
    votingDeadline: cycle.voting_deadline.toISOString(),
    status: cycle.status,
    createdAt: cycle.created_at.toISOString(),
    updatedAt: cycle.updated_at.toISOString(),
  }));
}

export async function getCurrentVotingCycle(): Promise<VotingCycleResponse | null> {
  const cycle = await db
    .selectFrom('voting_cycles')
    .selectAll()
    .where('status', 'in', ['suggesting', 'voting'])
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  if (!cycle) {
    return null;
  }

  return {
    id: cycle.id,
    suggestionDeadline: cycle.suggestion_deadline.toISOString(),
    votingDeadline: cycle.voting_deadline.toISOString(),
    status: cycle.status,
    createdAt: cycle.created_at.toISOString(),
    updatedAt: cycle.updated_at.toISOString(),
  };
}