import { db } from '../../database';
import { NewVote } from '../../database';

export interface SubmitVotesRequest {
  bookSuggestionIds: string[];
}

export interface VoteResponse {
  id: string;
  userId: string;
  votingCycleId: string;
  bookSuggestionId: string;
  createdAt: string;
}

export async function submitVotes(
  userId: string,
  data: SubmitVotesRequest
): Promise<VoteResponse[]> {
  const { bookSuggestionIds } = data;

  // Get current active voting cycle
  const currentCycle = await db
    .selectFrom('voting_cycles')
    .select(['id', 'status', 'voting_deadline'])
    .where('status', 'in', ['suggesting', 'voting'])
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  if (!currentCycle) {
    throw new Error('No active voting cycle found');
  }

  // Check if we're in the voting phase
  if (currentCycle.status !== 'voting') {
    throw new Error('Voting is only allowed during the voting phase');
  }

  // Check if voting deadline has passed
  const now = new Date();
  if (currentCycle.voting_deadline <= now) {
    throw new Error('Voting deadline has passed');
  }

  // Validate that all book suggestion IDs exist and belong to the current cycle
  if (bookSuggestionIds.length > 0) {
    // First validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of bookSuggestionIds) {
      if (!uuidRegex.test(id)) {
        throw new Error('One or more book suggestions are invalid or not part of the current voting cycle');
      }
    }

    const validSuggestions = await db
      .selectFrom('book_suggestions')
      .select('id')
      .where('id', 'in', bookSuggestionIds)
      .where('voting_cycle_id', '=', currentCycle.id)
      .execute();

    if (validSuggestions.length !== bookSuggestionIds.length) {
      throw new Error('One or more book suggestions are invalid or not part of the current voting cycle');
    }
  }

  // Use a transaction to ensure atomicity
  return await db.transaction().execute(async (trx) => {
    // Remove all existing votes for this user and cycle
    await trx
      .deleteFrom('votes')
      .where('user_id', '=', userId)
      .where('voting_cycle_id', '=', currentCycle.id)
      .execute();

    // Create new votes if any book suggestions were provided
    if (bookSuggestionIds.length === 0) {
      return []; // User chose to vote for no books
    }

    const newVotes: NewVote[] = bookSuggestionIds.map(bookSuggestionId => ({
      user_id: userId,
      voting_cycle_id: currentCycle.id,
      book_suggestion_id: bookSuggestionId,
    }));

    const createdVotes = await trx
      .insertInto('votes')
      .values(newVotes)
      .returningAll()
      .execute();

    return createdVotes.map(vote => ({
      id: vote.id,
      userId: vote.user_id,
      votingCycleId: vote.voting_cycle_id,
      bookSuggestionId: vote.book_suggestion_id,
      createdAt: vote.created_at.toISOString(),
    }));
  });
}

export async function getUserVotesForCycle(userId: string, cycleId: string): Promise<VoteResponse[]> {
  const votes = await db
    .selectFrom('votes')
    .selectAll()
    .where('user_id', '=', userId)
    .where('voting_cycle_id', '=', cycleId)
    .orderBy('created_at', 'asc')
    .execute();

  return votes.map(vote => ({
    id: vote.id,
    userId: vote.user_id,
    votingCycleId: vote.voting_cycle_id,
    bookSuggestionId: vote.book_suggestion_id,
    createdAt: vote.created_at.toISOString(),
  }));
}

export interface VoteResultResponse {
  bookSuggestionId: string;
  title: string;
  author: string;
  voteCount: number;
}

export async function getVoteResults(cycleId: string): Promise<VoteResultResponse[]> {
  // First validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(cycleId)) {
    throw new Error('Voting cycle not found');
  }

  // Check if the cycle is completed
  const cycle = await db
    .selectFrom('voting_cycles')
    .select(['status'])
    .where('id', '=', cycleId)
    .executeTakeFirst();

  if (!cycle) {
    throw new Error('Voting cycle not found');
  }

  if (cycle.status !== 'completed') {
    throw new Error('Vote results are only available for completed cycles');
  }

  const results = await db
    .selectFrom('votes')
    .innerJoin('book_suggestions', 'votes.book_suggestion_id', 'book_suggestions.id')
    .select([
      'book_suggestions.id as bookSuggestionId',
      'book_suggestions.title',
      'book_suggestions.author',
      db.fn.count('votes.id').as('voteCount')
    ])
    .where('votes.voting_cycle_id', '=', cycleId)
    .groupBy(['book_suggestions.id', 'book_suggestions.title', 'book_suggestions.author'])
    .orderBy('voteCount', 'desc')
    .execute();

  return results.map(result => ({
    bookSuggestionId: result.bookSuggestionId,
    title: result.title,
    author: result.author,
    voteCount: Number(result.voteCount),
  }));
}