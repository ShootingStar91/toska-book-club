# Test Data Management

This document describes how to manage test data for the Toska Book Club application, including user accounts, database initialization, and password management.

## Overview

The application includes several scripts for initializing the database with test data for different phases of the voting cycle. All test data is designed to provide realistic scenarios for development and testing.

## Test User Accounts

The following test users are available:

| Username | Password | Role    | Email                |
|----------|----------|---------|----------------------|
| admin    | admin123 | Admin   | admin@example.com    |
| alice    | alice123 | User    | alice@example.com    |
| bob      | bob123   | User    | bob@example.com      |
| charlie  | charlie123| User    | charlie@example.com  |

## Database Initialization Commands

Use these npm scripts to initialize the database with different scenarios:

### `npm run init-suggesting`
- **Purpose**: Sets up a suggesting phase scenario
- **Phase**: Suggesting (normal voting mode)
- **Data**: 
  - All test users
  - One book suggestion from Alice
  - Suggestion deadline: 1 month from now
  - Voting deadline: 1 month + 1 week from now

### `npm run init-voting`
- **Purpose**: Sets up a voting phase scenario
- **Phase**: Voting (ranking mode)
- **Data**:
  - All test users
  - Three book suggestions (Alice, Bob, Charlie)
  - Suggestion deadline: passed (1 day ago)
  - Voting deadline: active (1 week from now)

### `npm run init-results`
- **Purpose**: Sets up a completed voting cycle with results
- **Phase**: Completed (ranking mode)
- **Data**:
  - All test users
  - Three book suggestions (Alice, Bob, Charlie)
  - Complete ranking votes from all users
  - Both deadlines: passed

## Password Hash Generation

### Using the Hash Generator Script

A utility script is available at `backend/generate-password-hash.js` for generating bcrypt password hashes compatible with the application.

#### Generate hash for a specific password:
```bash
cd backend
node generate-password-hash.js "mypassword"
```

#### Generate hashes for all default test passwords:
```bash
cd backend
node generate-password-hash.js
```

This will output hashes for all test user passwords that can be copied into the `init-users.sql` file.

### Important Notes

- The script uses the same bcrypt configuration (10 salt rounds) as the application
- Always regenerate hashes if you change the bcrypt configuration
- The script is preserved for future use - do not delete it
- When updating password hashes, run the script and copy the output to `backend/init-users.sql`

## Database Structure

Each initialization script follows this pattern:

1. **Clean existing data**: Removes voting cycles, book suggestions, and votes
2. **Create users**: Inserts test users with proper password hashes (admin, alice, bob, charlie)
3. **Create scenario data**: Adds voting cycles, book suggestions, and votes appropriate for the phase

### Script Dependencies

- `init-users.sql`: Must be run first (included automatically in npm scripts)
- `init-test-data.sql`: Suggesting phase data
- `init-voting-phase.sql`: Voting phase data  
- `init-results-phase.sql`: Results phase data with votes

## Development Workflow

1. **Start development environment**: `npm run dev`
2. **Initialize test data**: Choose one scenario:
   - `npm run init-suggesting` - for testing book suggestion features
   - `npm run init-voting` - for testing voting interface
   - `npm run init-results` - for testing results display
3. **Login with test accounts**: Use any of the test user credentials above
4. **Test features**: Each scenario provides different data for testing different parts of the application

## Troubleshooting

### Login Issues
- Ensure you've run one of the initialization scripts
- Check that the database is running: `docker ps`
- Verify correct passwords are being used (see table above)

### Hash Generation Issues
- Ensure bcrypt is installed: `npm install` in the backend directory
- Check that the hash generator script exists: `backend/generate-password-hash.js`
- Verify the generated hashes are properly copied to `init-users.sql`

### Database Connection Issues
- Ensure Docker containers are running: `npm run dev`
- Check database logs: `docker logs <database-container-id>`
- Verify environment variables in `.env` file