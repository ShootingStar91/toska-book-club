import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export interface Database {
  // Add your table interfaces here
}

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
});

export const db = new Kysely<Database>({
  dialect,
});