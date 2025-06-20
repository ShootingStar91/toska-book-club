import { beforeEach, afterEach } from 'vitest';
import { testDb } from './test-database';

// Clean up database before each test
beforeEach(async () => {
  // Delete test data in reverse order (respecting foreign keys)
  await testDb.deleteFrom('votes').execute();
  await testDb.deleteFrom('book_suggestions').execute(); 
  await testDb.deleteFrom('voting_cycles').execute();
  await testDb.deleteFrom('users').execute();
});

// Optional: Clean up after each test too
afterEach(async () => {
  // Could add additional cleanup if needed
});

// Helper function to create test users
export async function createTestUser(userData: {
  username: string;
  email: string;
  password_hash: string;
  is_admin?: boolean;
}) {
  return await testDb
    .insertInto('users')
    .values({
      username: userData.username,
      email: userData.email,
      password_hash: userData.password_hash,
      is_admin: userData.is_admin ?? false,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}