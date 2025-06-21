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

export interface UpdateBookSuggestionRequest {
  title?: string;
  author?: string;
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

export async function updateBookSuggestion(
  userId: string,
  suggestionId: string,
  data: UpdateBookSuggestionRequest
): Promise<BookSuggestionResponse> {
  const { title, author, year, pageCount, link, miscInfo } = data;

  // Validate that at least one field is being updated
  if (!title && !author && year === undefined && pageCount === undefined && link === undefined && miscInfo === undefined) {
    throw new Error('At least one field must be provided for update');
  }

  // Get the existing suggestion to verify ownership and cycle status
  const existingSuggestion = await db
    .selectFrom('book_suggestions')
    .selectAll()
    .where('id', '=', suggestionId)
    .where('user_id', '=', userId) // Ensure user owns this suggestion
    .executeTakeFirst();

  if (!existingSuggestion) {
    throw new Error('Book suggestion not found or you do not have permission to edit it');
  }

  // Get the voting cycle to check if we're still in suggestion phase
  const cycle = await db
    .selectFrom('voting_cycles')
    .select(['status', 'suggestion_deadline'])
    .where('id', '=', existingSuggestion.voting_cycle_id)
    .executeTakeFirst();

  if (!cycle) {
    throw new Error('Voting cycle not found');
  }

  // Check if we're still in the suggesting phase
  if (cycle.status !== 'suggesting') {
    throw new Error('Book suggestions can only be edited during the suggesting phase');
  }

  // Check if suggestion deadline has passed
  const now = new Date();
  if (cycle.suggestion_deadline <= now) {
    throw new Error('Suggestion deadline has passed');
  }

  // Validate required fields if they're being updated
  const finalTitle = title !== undefined ? title : existingSuggestion.title;
  const finalAuthor = author !== undefined ? author : existingSuggestion.author;
  
  if (!finalTitle || !finalAuthor) {
    throw new Error('Title and author are required');
  }

  // Build update object with only provided fields
  const updateData: Partial<{
    title: string;
    author: string;
    year: number | null;
    page_count: number | null;
    link: string | null;
    misc_info: string | null;
  }> = {};

  if (title !== undefined) updateData.title = title;
  if (author !== undefined) updateData.author = author;
  if (year !== undefined) updateData.year = year || null;
  if (pageCount !== undefined) updateData.page_count = pageCount || null;
  if (link !== undefined) updateData.link = link || null;
  if (miscInfo !== undefined) updateData.misc_info = miscInfo || null;

  // Update the suggestion
  const updatedSuggestion = await db
    .updateTable('book_suggestions')
    .set(updateData)
    .where('id', '=', suggestionId)
    .where('user_id', '=', userId)
    .returningAll()
    .executeTakeFirstOrThrow();

  return {
    id: updatedSuggestion.id,
    userId: updatedSuggestion.user_id,
    votingCycleId: updatedSuggestion.voting_cycle_id,
    title: updatedSuggestion.title,
    author: updatedSuggestion.author,
    year: updatedSuggestion.year,
    pageCount: updatedSuggestion.page_count,
    link: updatedSuggestion.link,
    miscInfo: updatedSuggestion.misc_info,
    createdAt: updatedSuggestion.created_at.toISOString(),
    updatedAt: updatedSuggestion.updated_at.toISOString(),
  };
}