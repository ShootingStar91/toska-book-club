import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add voting_mode column to voting_cycles table
  await db.schema
    .alterTable('voting_cycles')
    .addColumn('voting_mode', 'varchar(20)', (col) => 
      col.notNull().defaultTo('normal')
    )
    .execute();
    
  // Add check constraint for voting_mode values
  await db.schema
    .alterTable('voting_cycles')
    .addCheckConstraint('voting_mode_check', sql`voting_mode IN ('normal', 'ranking')`)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove the check constraint first
  await db.schema
    .alterTable('voting_cycles')
    .dropConstraint('voting_mode_check')
    .execute();
    
  // Remove the voting_mode column
  await db.schema
    .alterTable('voting_cycles')
    .dropColumn('voting_mode')
    .execute();
}