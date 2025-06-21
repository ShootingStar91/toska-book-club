# Database Initialization Scripts

This directory contains several SQL scripts to initialize the database with test data for different scenarios.

## Scripts Overview

### 1. `init-users.sql`
**Purpose**: Sets up test users only
**Users created**:
- `admin` (password: admin123) - Admin user
- `alice` (password: alice123) - Regular user
- `bob` (password: bob123) - Regular user  
- `charlie` (password: charlie123) - Regular user

### 2. `init-test-data.sql` (Suggesting Phase)
**Purpose**: Creates a suggesting phase scenario with normal voting mode
**Requires**: Run `init-users.sql` first
**Creates**:
- Voting cycle in "suggesting" phase with normal voting mode
- One book suggestion from Alice
- Suggestion deadline: 1 month from now
- Voting deadline: 1 month + 1 week from now

### 3. `init-voting-phase.sql` (Voting Phase - Ranking Mode)
**Purpose**: Creates a voting phase scenario with ranking mode enabled
**Requires**: Run `init-users.sql` first
**Creates**:
- Voting cycle in "voting" phase with ranking voting mode
- Three book suggestions (from Alice, Bob, Charlie)
- Suggestion deadline: 1 day ago (passed)
- Voting deadline: 1 week from now (active voting)

**Books suggested**:
- Alice: "Clean Code" by Robert C. Martin (2008)
- Bob: "The Phoenix Project" by Gene Kim, Kevin Behr, George Spafford (2013)
- Charlie: "Atomic Habits" by James Clear (2018)

### 4. `init-results-phase.sql` (Results Phase - With Votes)
**Purpose**: Creates a completed voting cycle with results
**Requires**: Run `init-users.sql` first
**Creates**:
- Voting cycle in "completed" phase with ranking voting mode
- Three book suggestions (from Alice, Bob, Charlie)
- Ranking votes from all four users (including admin)
- Both deadlines have passed

**Books suggested**:
- Alice: "Design Patterns" by Gang of Four (1994)
- Bob: "Refactoring" by Martin Fowler (1999)
- Charlie: "The Art of Computer Programming" by Donald E. Knuth (1968)

**Vote distribution**:
- "Design Patterns" gets 2 points (wins with tie-breaker)
- "Refactoring" gets 1 point
- "The Art of Computer Programming" gets 1 point

## How to Use

### Method 1: Using psql command line
```bash
# First, always set up users
psql -U postgres -d book_club_dev -f init-users.sql

# Then choose one scenario:

# For suggesting phase:
psql -U postgres -d book_club_dev -f init-test-data.sql

# For voting phase (ranking mode):
psql -U postgres -d book_club_dev -f init-voting-phase.sql

# For results phase (completed voting):
psql -U postgres -d book_club_dev -f init-results-phase.sql
```

### Method 2: Using Docker exec
```bash
# First, always set up users
docker exec -i book-club-db psql -U postgres -d book_club_dev < init-users.sql

# Then choose one scenario:

# For suggesting phase:
docker exec -i book-club-db psql -U postgres -d book_club_dev < init-test-data.sql

# For voting phase (ranking mode):
docker exec -i book-club-db psql -U postgres -d book_club_dev < init-voting-phase.sql

# For results phase (completed voting):
docker exec -i book-club-db psql -U postgres -d book_club_dev < init-results-phase.sql
```

## Notes

- Each script (except `init-users.sql`) cleans existing voting data but preserves users
- `init-users.sql` cleans everything including users
- All passwords use bcrypt hashing
- UUIDs are generated automatically
- Scripts include verification queries that show what was created
- The results phase script demonstrates ranking voting with realistic vote distribution