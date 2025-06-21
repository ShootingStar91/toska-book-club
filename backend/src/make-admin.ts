import { db } from './database';

async function makeUserAdmin() {
  // Get the email from command line argument
  const email = process.argv[2];
  
  if (!email) {
    console.error('Usage: tsx src/make-admin.ts <email>');
    process.exit(1);
  }

  try {
    // Update user to be admin
    const result = await db
      .updateTable('users')
      .set({ is_admin: true })
      .where('email', '=', email)
      .returningAll()
      .execute();

    if (result.length === 0) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    console.log(`Successfully made user admin:`, result[0]);
    console.log(`User ${result[0].username} (${result[0].email}) is now an admin`);
  } catch (error) {
    console.error('Error making user admin:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

if (require.main === module) {
  makeUserAdmin();
}