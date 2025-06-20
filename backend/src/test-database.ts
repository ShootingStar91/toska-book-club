import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { Database } from './database';

// Load test environment variables when running outside Docker
if (!process.env.DATABASE_URL?.includes('database:5432')) {
  dotenv.config({ path: '.env.test' });
}

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
});

export const testDb = new Kysely<Database>({
  dialect,
});