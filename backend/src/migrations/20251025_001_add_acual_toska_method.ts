import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Drop the old constraint first
  await db.schema
    .alterTable('voting_cycles')
    .dropConstraint('voting_mode_check')
    .execute()

  // Add a new constraint including 'acual-toska-method'
  await db.schema
    .alterTable('voting_cycles')
    .addCheckConstraint(
      'voting_mode_check',
      sql`voting_mode IN ('normal', 'ranking', 'acual-toska-method')`
    )
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  // Revert to the old constraint (without 'acual-toska-method')
  await db.schema
    .alterTable('voting_cycles')
    .dropConstraint('voting_mode_check')
    .execute()

  await db.schema
    .alterTable('voting_cycles')
    .addCheckConstraint(
      'voting_mode_check',
      sql`voting_mode IN ('normal', 'ranking')`
    )
    .execute()
}
