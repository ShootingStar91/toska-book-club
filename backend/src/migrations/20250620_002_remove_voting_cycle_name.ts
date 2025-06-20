import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Remove the name column from voting_cycles table
  await db.schema
    .alterTable('voting_cycles')
    .dropColumn('name')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Add the name column back
  await db.schema
    .alterTable('voting_cycles')
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .execute();

  // Add unique constraint back
  await db.schema
    .alterTable('voting_cycles')
    .addUniqueConstraint('voting_cycles_name_key', ['name'])
    .execute();
}