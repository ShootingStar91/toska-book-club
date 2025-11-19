import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Make the specific user an admin
  await db
    .updateTable('users')
    .set({ is_admin: true })
    .where('id', '=', '8ceb09ab-5608-4224-af68-50674a6aeaeb')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Revert the admin flag if rolling back
  await db
    .updateTable('users')
    .set({ is_admin: false })
    .where('id', '=', '8ceb09ab-5608-4224-af68-50674a6aeaeb')
    .execute();
}
