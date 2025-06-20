import { Kysely, PostgresDialect, Generated, Insertable, Selectable, Updateable } from 'kysely';
import { Pool } from 'pg';

export interface Database {
  users: UsersTable;
  voting_cycles: VotingCyclesTable;
  book_suggestions: BookSuggestionsTable;
  votes: VotesTable;
}

export interface UsersTable {
  id: Generated<string>;
  email: string;
  username: string;
  password_hash: string;
  is_admin: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface VotingCyclesTable {
  id: Generated<string>;
  suggestion_deadline: Date;
  voting_deadline: Date;
  status: Generated<'suggesting' | 'voting' | 'completed'>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface BookSuggestionsTable {
  id: Generated<string>;
  user_id: string;
  voting_cycle_id: string;
  title: string;
  author: string;
  year: number | null;
  page_count: number | null;
  link: string | null;
  misc_info: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface VotesTable {
  id: Generated<string>;
  user_id: string;
  voting_cycle_id: string;
  book_suggestion_id: string;
  created_at: Generated<Date>;
}

// Type helpers for easier use
export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export type VotingCycle = Selectable<VotingCyclesTable>;
export type NewVotingCycle = Insertable<VotingCyclesTable>;
export type VotingCycleUpdate = Updateable<VotingCyclesTable>;

export type BookSuggestion = Selectable<BookSuggestionsTable>;
export type NewBookSuggestion = Insertable<BookSuggestionsTable>;
export type BookSuggestionUpdate = Updateable<BookSuggestionsTable>;

export type Vote = Selectable<VotesTable>;
export type NewVote = Insertable<VotesTable>;

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
});

export const db = new Kysely<Database>({
  dialect,
});