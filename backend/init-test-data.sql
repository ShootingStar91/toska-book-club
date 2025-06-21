-- Clean the database
DELETE FROM votes;
DELETE FROM book_suggestions;
DELETE FROM voting_cycles;
DELETE FROM users;

-- Reset sequences (if any)
-- Note: PostgreSQL uses SERIAL/UUID, so no sequences to reset for UUIDs

-- Insert test users
INSERT INTO users (id, username, email, password_hash, is_admin, created_at, updated_at) VALUES
  (
    gen_random_uuid(),
    'admin',
    'admin@example.com',
    '$2b$10$Qkv/8ACu60Ir5CaN/u1KqeELFt.x61EBBGHiutXZ4BQUeM4IXDwWK', -- password: admin123
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'alice',
    'alice@example.com', 
    '$2b$10$gfAwNqDKylgjaHYvOaQuX.c8QX5tGK6OMzVm6HtXOwIELPozinZyS', -- password: alice123
    false,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'bob',
    'bob@example.com',
    '$2b$10$b/VG677kKn7cP0M9P5xW0.B7sh7xanie9zHdrfBlKuG8rQIqqvLBK', -- password: bob123
    false,
    NOW(),
    NOW()
  );

-- Create a voting cycle with suggestion deadline 1 month from now
INSERT INTO voting_cycles (id, suggestion_deadline, voting_deadline, status, created_at, updated_at) VALUES
  (
    gen_random_uuid(),
    NOW() + INTERVAL '1 month',
    NOW() + INTERVAL '1 month 1 week',
    'suggesting',
    NOW(),
    NOW()
  );

-- Get the user ID and cycle ID for creating book suggestion
WITH alice_user AS (
  SELECT id FROM users WHERE username = 'alice'
),
current_cycle AS (
  SELECT id FROM voting_cycles WHERE status = 'suggesting' ORDER BY created_at DESC LIMIT 1
)
-- Insert a book suggestion from Alice
INSERT INTO book_suggestions (id, user_id, voting_cycle_id, title, author, year, page_count, link, misc_info, created_at, updated_at)
SELECT
  gen_random_uuid(),
  alice_user.id,
  current_cycle.id,
  'The Pragmatic Programmer',
  'David Thomas, Andrew Hunt',
  2019,
  352,
  'https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/',
  'A classic book about software development best practices. Updated 20th anniversary edition with new insights.',
  NOW(),
  NOW()
FROM alice_user, current_cycle;

-- Verify the data was inserted
SELECT 'Users created:' as info;
SELECT username, email, is_admin FROM users ORDER BY username;

SELECT 'Voting cycle created:' as info;
SELECT id, suggestion_deadline, voting_deadline, status FROM voting_cycles;

SELECT 'Book suggestion created:' as info;
SELECT bs.title, bs.author, u.username as suggested_by 
FROM book_suggestions bs 
JOIN users u ON bs.user_id = u.id;