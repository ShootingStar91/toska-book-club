# Test Users

This document lists the test users created by the `npm run init-test-data` command.

## Available Users

| Username | Email | Password | Admin | Description |
|----------|-------|----------|-------|-------------|
| `admin` | admin@example.com | `admin123` | ✅ Yes | Administrator account with full access |
| `alice` | alice@example.com | `alice123` | ❌ No | Regular user who has already suggested a book |
| `bob` | bob@example.com | `bob123` | ❌ No | Regular user without suggestions |

## Test Data

When you run `npm run init-test-data`, the following data is created:

1. **3 test users** (listed above)
2. **1 voting cycle** in "suggesting" phase
   - Suggestion deadline: 1 month from when script is run
   - Voting deadline: 1 month + 1 week from when script is run
3. **1 book suggestion** from Alice:
   - Title: "The Pragmatic Programmer"
   - Author: "David Thomas, Andrew Hunt"
   - Year: 2019
   - Pages: 352
   - Link: https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/
   - Description: "A classic book about software development best practices. Updated 20th anniversary edition with new insights."

## Usage

1. **Initialize test data:**
   ```bash
   npm run init-test-data
   ```

2. **Login as any user:**
   - Frontend: Use the credentials above in the login form
   - API: POST to `/auth/login` with username and password

3. **Test scenarios:**
   - **As Admin**: Create/edit voting cycles, manage the system
   - **As Alice**: View your existing book suggestion, add more suggestions
   - **As Bob**: Add new book suggestions, vote when cycle transitions

## Notes

- The command cleans the database before adding test data
- Passwords are properly hashed with bcrypt
- The voting cycle is set to "suggesting" phase by default
- All timestamps use the current time when the script runs