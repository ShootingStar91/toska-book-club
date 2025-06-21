import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add points column to votes table (defaults to 1 for existing normal votes)
  await db.schema
    .alterTable('votes')
    .addColumn('points', 'integer', (col) => 
      col.notNull().defaultTo(1)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove the points column
  await db.schema
    .alterTable('votes')
    .dropColumn('points')
    .execute();
}