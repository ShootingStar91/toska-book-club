import { promises as fs } from 'fs';
import path from 'path';
import { Migrator, FileMigrationProvider } from 'kysely';
import { db } from './database';

export async function migrateToLatest(dontDestroy?: boolean) {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`Migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`Failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('Failed to migrate');
    console.error(error);
    process.exit(1);
  }
  if (dontDestroy) {
    return;
  }
  await db.destroy();
}

async function migrateDown() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  const { error, results } = await migrator.migrateDown();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`Migration "${it.migrationName}" was rolled back successfully`);
    } else if (it.status === 'Error') {
      console.error(`Failed to rollback migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('Failed to rollback migration');
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'up') {
    migrateToLatest();
  } else if (command === 'down') {
    migrateDown();
  } else {
    console.log('Usage: tsx src/migrate.ts [up|down]');
    process.exit(1);
  }
}
