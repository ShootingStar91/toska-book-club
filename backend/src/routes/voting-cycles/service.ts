import { db } from '../../database';
import { NewVotingCycle } from '../../database';

export interface CreateVotingCycleRequest {
  name: string;
  suggestionDeadline: string; // ISO date string
  votingDeadline: string; // ISO date string
}

export interface VotingCycleResponse {
  id: string;
  name: string;
  suggestionDeadline: string;
  votingDeadline: string;
  status: 'suggesting' | 'voting' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export async function createVotingCycle(data: CreateVotingCycleRequest): Promise<VotingCycleResponse> {
  const { name, suggestionDeadline, votingDeadline } = data;

  // Validate required fields
  if (!name || !suggestionDeadline || !votingDeadline) {
    throw new Error('Name, suggestion deadline, and voting deadline are required');
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

  // Check if name already exists
  const existingCycle = await db
    .selectFrom('voting_cycles')
    .select('id')
    .where('name', '=', name)
    .executeTakeFirst();

  if (existingCycle) {
    throw new Error('A voting cycle with this name already exists');
  }

  // Create the voting cycle
  const newCycle: NewVotingCycle = {
    name,
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
    name: createdCycle.name,
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
    name: cycle.name,
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
    name: cycle.name,
    suggestionDeadline: cycle.suggestion_deadline.toISOString(),
    votingDeadline: cycle.voting_deadline.toISOString(),
    status: cycle.status,
    createdAt: cycle.created_at.toISOString(),
    updatedAt: cycle.updated_at.toISOString(),
  };
}