-- Initialize database for suggesting phase (original scenario)
-- Run init-users.sql first to set up users

-- Clean existing voting data
DELETE FROM votes;
DELETE FROM book_suggestions;
DELETE FROM voting_cycles;

-- Create a voting cycle in suggesting phase with normal mode
INSERT INTO voting_cycles (id, suggestion_deadline, voting_deadline, voting_mode, status, created_at, updated_at) VALUES
  (
    gen_random_uuid(),
    NOW() + INTERVAL '1 month',
    NOW() + INTERVAL '1 month 1 week',
    'normal',
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
SELECT 'Voting cycle created (suggesting phase, normal mode):' as info;
SELECT id, suggestion_deadline, voting_deadline, voting_mode, status FROM voting_cycles;

SELECT 'Book suggestion created:' as info;
SELECT bs.title, bs.author, u.username as suggested_by 
FROM book_suggestions bs 
JOIN users u ON bs.user_id = u.id;