import { db } from '../../database';
import { NewBookSuggestion } from '../../database';

export interface CreateBookSuggestionRequest {
  title: string;
  author: string;
  year?: number;
  pageCount?: number;
  link?: string;
  miscInfo?: string;
}

export interface BookSuggestionResponse {
  id: string;
  userId: string;
  votingCycleId: string;
  title: string;
  author: string;
  year: number | null;
  pageCount: number | null;
  link: string | null;
  miscInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createBookSuggestion(
  userId: string,
  data: CreateBookSuggestionRequest
): Promise<BookSuggestionResponse> {
  const { title, author, year, pageCount, link, miscInfo } = data;

  // Validate required fields
  if (!title || !author) {
    throw new Error('Title and author are required');
  }

  // Get current active voting cycle
  const currentCycle = await db
    .selectFrom('voting_cycles')
    .select(['id', 'status', 'suggestion_deadline'])
    .where('status', 'in', ['suggesting', 'voting'])
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  if (!currentCycle) {
    throw new Error('No active voting cycle found');
  }

  // Check if we're in the suggesting phase
  if (currentCycle.status !== 'suggesting') {
    throw new Error('Book suggestions are only allowed during the suggesting phase');
  }

  // Check if suggestion deadline has passed
  const now = new Date();
  if (currentCycle.suggestion_deadline <= now) {
    throw new Error('Suggestion deadline has passed');
  }

  // Check if user already has a suggestion for this cycle
  const existingSuggestion = await db
    .selectFrom('book_suggestions')
    .select('id')
    .where('user_id', '=', userId)
    .where('voting_cycle_id', '=', currentCycle.id)
    .executeTakeFirst();

  if (existingSuggestion) {
    throw new Error('You can only suggest one book per voting cycle');
  }

  // Create the book suggestion
  const newSuggestion: NewBookSuggestion = {
    user_id: userId,
    voting_cycle_id: currentCycle.id,
    title,
    author,
    year: year || null,
    page_count: pageCount || null,
    link: link || null,
    misc_info: miscInfo || null,
  };

  const createdSuggestion = await db
    .insertInto('book_suggestions')
    .values(newSuggestion)
    .returningAll()
    .executeTakeFirstOrThrow();

  return {
    id: createdSuggestion.id,
    userId: createdSuggestion.user_id,
    votingCycleId: createdSuggestion.voting_cycle_id,
    title: createdSuggestion.title,
    author: createdSuggestion.author,
    year: createdSuggestion.year,
    pageCount: createdSuggestion.page_count,
    link: createdSuggestion.link,
    miscInfo: createdSuggestion.misc_info,
    createdAt: createdSuggestion.created_at.toISOString(),
    updatedAt: createdSuggestion.updated_at.toISOString(),
  };
}

export async function getBookSuggestionsForCycle(cycleId: string): Promise<BookSuggestionResponse[]> {
  const suggestions = await db
    .selectFrom('book_suggestions')
    .selectAll()
    .where('voting_cycle_id', '=', cycleId)
    .orderBy('created_at', 'asc')
    .execute();

  return suggestions.map(suggestion => ({
    id: suggestion.id,
    userId: suggestion.user_id,
    votingCycleId: suggestion.voting_cycle_id,
    title: suggestion.title,
    author: suggestion.author,
    year: suggestion.year,
    pageCount: suggestion.page_count,
    link: suggestion.link,
    miscInfo: suggestion.misc_info,
    createdAt: suggestion.created_at.toISOString(),
    updatedAt: suggestion.updated_at.toISOString(),
  }));
}

export async function getUserSuggestionForCycle(userId: string, cycleId: string): Promise<BookSuggestionResponse | null> {
  const suggestion = await db
    .selectFrom('book_suggestions')
    .selectAll()
    .where('user_id', '=', userId)
    .where('voting_cycle_id', '=', cycleId)
    .executeTakeFirst();

  if (!suggestion) {
    return null;
  }

  return {
    id: suggestion.id,
    userId: suggestion.user_id,
    votingCycleId: suggestion.voting_cycle_id,
    title: suggestion.title,
    author: suggestion.author,
    year: suggestion.year,
    pageCount: suggestion.page_count,
    link: suggestion.link,
    miscInfo: suggestion.misc_info,
    createdAt: suggestion.created_at.toISOString(),
    updatedAt: suggestion.updated_at.toISOString(),
  };
}