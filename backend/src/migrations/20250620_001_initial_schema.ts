import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create users table
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('username', 'varchar(50)', (col) => col.notNull().unique())
    .addColumn('password_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('is_admin', 'boolean', (col) => col.defaultTo(false))
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Create voting_cycles table
  await db.schema
    .createTable('voting_cycles')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('name', 'varchar(200)', (col) => col.notNull().unique())
    .addColumn('suggestion_deadline', 'timestamp', (col) => col.notNull())
    .addColumn('voting_deadline', 'timestamp', (col) => col.notNull())
    .addColumn('status', 'varchar(20)', (col) => col.defaultTo('suggesting').notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Create book_suggestions table
  await db.schema
    .createTable('book_suggestions')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('restrict'))
    .addColumn('voting_cycle_id', 'uuid', (col) => col.notNull().references('voting_cycles.id').onDelete('cascade'))
    .addColumn('title', 'varchar(500)', (col) => col.notNull())
    .addColumn('author', 'varchar(200)', (col) => col.notNull())
    .addColumn('year', 'integer')
    .addColumn('page_count', 'integer')
    .addColumn('link', 'varchar(1000)')
    .addColumn('misc_info', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Create votes table
  await db.schema
    .createTable('votes')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('restrict'))
    .addColumn('voting_cycle_id', 'uuid', (col) => col.notNull().references('voting_cycles.id').onDelete('cascade'))
    .addColumn('book_suggestion_id', 'uuid', (col) => col.notNull().references('book_suggestions.id').onDelete('cascade'))
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Add constraints
  await db.schema
    .alterTable('voting_cycles')
    .addCheckConstraint('voting_deadline_after_suggestion', sql`voting_deadline > suggestion_deadline`)
    .execute();

  await db.schema
    .alterTable('voting_cycles')
    .addCheckConstraint('valid_status', sql`status IN ('suggesting', 'voting', 'completed')`)
    .execute();

  await db.schema
    .alterTable('book_suggestions')
    .addCheckConstraint('positive_year', sql`year IS NULL OR (year > 1000 AND year <= extract(year from now()) + 5)`)
    .execute();

  await db.schema
    .alterTable('book_suggestions')
    .addCheckConstraint('positive_page_count', sql`page_count IS NULL OR page_count > 0`)
    .execute();

  // Add unique constraints
  await db.schema
    .alterTable('book_suggestions')
    .addUniqueConstraint('user_one_suggestion_per_cycle', ['user_id', 'voting_cycle_id'])
    .execute();

  await db.schema
    .alterTable('votes')
    .addUniqueConstraint('user_vote_once_per_suggestion', ['user_id', 'voting_cycle_id', 'book_suggestion_id'])
    .execute();

  // Add indexes for performance
  await db.schema
    .createIndex('idx_voting_cycles_status')
    .on('voting_cycles')
    .column('status')
    .execute();

  await db.schema
    .createIndex('idx_book_suggestions_voting_cycle')
    .on('book_suggestions')
    .column('voting_cycle_id')
    .execute();

  await db.schema
    .createIndex('idx_votes_voting_cycle')
    .on('votes')
    .column('voting_cycle_id')
    .execute();

  await db.schema
    .createIndex('idx_users_email')
    .on('users')
    .column('email')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables in reverse order (respecting foreign keys)
  await db.schema.dropTable('votes').execute();
  await db.schema.dropTable('book_suggestions').execute();
  await db.schema.dropTable('voting_cycles').execute();
  await db.schema.dropTable('users').execute();
}