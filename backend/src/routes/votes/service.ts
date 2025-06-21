import { db } from '../../database';
import { NewVote } from '../../database';

export interface SubmitVotesRequest {
  // For normal mode (backward compatibility)
  bookSuggestionIds?: string[];
  // For ranking mode - books ordered from best (most points) to worst (least points)
  orderedBookIds?: string[];
}

export interface VoteResponse {
  id: string;
  userId: string;
  votingCycleId: string;
  bookSuggestionId: string;
  points: number;
  createdAt: string;
}

export async function submitVotes(
  userId: string,
  data: SubmitVotesRequest
): Promise<VoteResponse[]> {
  const { bookSuggestionIds, orderedBookIds } = data;

  // Get current active voting cycle
  const currentCycle = await db
    .selectFrom('voting_cycles')
    .select(['id', 'status', 'voting_deadline', 'voting_mode'])
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

  // Handle different voting modes
  if (currentCycle.voting_mode === 'ranking') {
    return await handleRankingModeVoting(userId, currentCycle.id, orderedBookIds);
  } else {
    return await handleNormalModeVoting(userId, currentCycle.id, bookSuggestionIds);
  }
}

async function handleNormalModeVoting(
  userId: string,
  cycleId: string,
  bookSuggestionIds?: string[]
): Promise<VoteResponse[]> {
  if (!bookSuggestionIds) {
    throw new Error('Normal mode requires bookSuggestionIds');
  }

  // Validate that all book suggestion IDs exist and belong to the current cycle
  if (bookSuggestionIds.length > 0) {
    await validateBookSuggestionIds(bookSuggestionIds, cycleId);
  }

  // Use a transaction to ensure atomicity
  return await db.transaction().execute(async (trx) => {
    // Remove all existing votes for this user and cycle
    await trx
      .deleteFrom('votes')
      .where('user_id', '=', userId)
      .where('voting_cycle_id', '=', cycleId)
      .execute();

    // Create new votes if any book suggestions were provided
    if (bookSuggestionIds.length === 0) {
      return []; // User chose to vote for no books
    }

    const newVotes: NewVote[] = bookSuggestionIds.map(bookSuggestionId => ({
      user_id: userId,
      voting_cycle_id: cycleId,
      book_suggestion_id: bookSuggestionId,
      points: 1, // Normal mode: each vote = 1 point
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
      points: vote.points,
      createdAt: vote.created_at.toISOString(),
    }));
  });
}

async function handleRankingModeVoting(
  userId: string,
  cycleId: string,
  orderedBookIds?: string[]
): Promise<VoteResponse[]> {
  if (!orderedBookIds) {
    throw new Error('Ranking mode requires orderedBookIds');
  }

  // Get all book suggestions for this cycle, separating user's own from others
  const allSuggestions = await db
    .selectFrom('book_suggestions')
    .select(['id', 'user_id'])
    .where('voting_cycle_id', '=', cycleId)
    .execute();

  const userOwnBooks = allSuggestions.filter(s => s.user_id === userId);
  const otherBooks = allSuggestions.filter(s => s.user_id !== userId);

  // Validate that user hasn't included their own book in the ranking
  const userOwnBookIds = userOwnBooks.map(book => book.id);
  const hasOwnBook = orderedBookIds.some(bookId => userOwnBookIds.includes(bookId));
  if (hasOwnBook) {
    throw new Error('Cannot include your own book suggestion in ranking');
  }

  // Validate that all books except user's own are ranked
  if (orderedBookIds.length !== otherBooks.length) {
    throw new Error(`In ranking mode, all books except your own must be ranked. Expected ${otherBooks.length} books, got ${orderedBookIds.length}`);
  }

  // Validate that all provided IDs exist and belong to the current cycle (and are not user's own)
  await validateBookSuggestionIdsForRanking(orderedBookIds, cycleId, userId);

  // Use a transaction to ensure atomicity
  return await db.transaction().execute(async (trx) => {
    // Remove all existing votes for this user and cycle
    await trx
      .deleteFrom('votes')
      .where('user_id', '=', userId)
      .where('voting_cycle_id', '=', cycleId)
      .execute();

    // Create ranking votes: first book gets N-1 points, last gets 0 points
    const totalBooks = orderedBookIds.length;
    const newVotes: NewVote[] = orderedBookIds.map((bookSuggestionId, index) => ({
      user_id: userId,
      voting_cycle_id: cycleId,
      book_suggestion_id: bookSuggestionId,
      points: totalBooks - 1 - index, // First book = N-1 points, last = 0 points
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
      points: vote.points,
      createdAt: vote.created_at.toISOString(),
    }));
  });
}

async function validateBookSuggestionIds(bookSuggestionIds: string[], cycleId: string): Promise<void> {
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
    .where('voting_cycle_id', '=', cycleId)
    .execute();

  if (validSuggestions.length !== bookSuggestionIds.length) {
    throw new Error('One or more book suggestions are invalid or not part of the current voting cycle');
  }
}

async function validateBookSuggestionIdsForRanking(bookSuggestionIds: string[], cycleId: string, userId: string): Promise<void> {
  // First validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const id of bookSuggestionIds) {
    if (!uuidRegex.test(id)) {
      throw new Error('One or more book suggestions are invalid or not part of the current voting cycle');
    }
  }

  const validSuggestions = await db
    .selectFrom('book_suggestions')
    .select(['id', 'user_id'])
    .where('id', 'in', bookSuggestionIds)
    .where('voting_cycle_id', '=', cycleId)
    .execute();

  if (validSuggestions.length !== bookSuggestionIds.length) {
    throw new Error('One or more book suggestions are invalid or not part of the current voting cycle');
  }

  // Double-check that none of the books belong to the user
  const userOwnBooks = validSuggestions.filter(s => s.user_id === userId);
  if (userOwnBooks.length > 0) {
    throw new Error('Cannot include your own book suggestion in ranking');
  }
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
    points: vote.points,
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
      db.fn.sum('votes.points').as('voteCount') // Sum points instead of counting votes
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