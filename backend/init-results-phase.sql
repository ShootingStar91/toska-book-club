-- Initialize database for results phase with completed voting
-- Run init-users.sql first to set up users

-- Clean existing voting data
DELETE FROM votes;
DELETE FROM book_suggestions;
DELETE FROM voting_cycles;

-- Create a completed voting cycle with ranking mode
INSERT INTO voting_cycles (id, suggestion_deadline, voting_deadline, voting_mode, status, created_at, updated_at) VALUES
  (
    gen_random_uuid(),
    NOW() - INTERVAL '1 week', -- Suggestion deadline has passed
    NOW() - INTERVAL '1 day',  -- Voting deadline has passed
    'ranking',
    'completed',
    NOW() - INTERVAL '8 days',
    NOW()
  );

-- Get user IDs and cycle ID for creating book suggestions and votes
WITH users_data AS (
  SELECT 
    id,
    username,
    ROW_NUMBER() OVER (ORDER BY username) as rn
  FROM users 
  WHERE username IN ('alice', 'bob', 'charlie')
),
current_cycle AS (
  SELECT id FROM voting_cycles WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1
),
-- Insert three book suggestions
inserted_suggestions AS (
  INSERT INTO book_suggestions (id, user_id, voting_cycle_id, title, author, year, page_count, link, misc_info, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    users_data.id,
    current_cycle.id,
    CASE users_data.rn
      WHEN 1 THEN 'Design Patterns'
      WHEN 2 THEN 'Refactoring'
      WHEN 3 THEN 'The Art of Computer Programming'
    END,
    CASE users_data.rn
      WHEN 1 THEN 'Gang of Four'
      WHEN 2 THEN 'Martin Fowler'
      WHEN 3 THEN 'Donald E. Knuth'
    END,
    CASE users_data.rn
      WHEN 1 THEN 1994
      WHEN 2 THEN 1999
      WHEN 3 THEN 1968
    END,
    CASE users_data.rn
      WHEN 1 THEN 395
      WHEN 2 THEN 448
      WHEN 3 THEN 650
    END,
    CASE users_data.rn
      WHEN 1 THEN 'https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612'
      WHEN 2 THEN 'https://martinfowler.com/books/refactoring.html'
      WHEN 3 THEN 'https://www-cs-faculty.stanford.edu/~knuth/taocp.html'
    END,
    CASE users_data.rn
      WHEN 1 THEN 'Classic book on software design patterns. Essential for object-oriented programming.'
      WHEN 2 THEN 'The definitive guide to improving the design of existing code without changing its behavior.'
      WHEN 3 THEN 'The legendary multi-volume work on computer programming. Volume 1 covers fundamental algorithms.'
    END,
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days'
  FROM users_data, current_cycle
  RETURNING id, user_id, title
),
-- Get all suggestions and users for vote creation
suggestion_user_data AS (
  SELECT 
    s.id as suggestion_id,
    s.user_id as suggestion_owner_id,
    u.id as voter_id,
    u.username as voter_name,
    s.title
  FROM book_suggestions s
  CROSS JOIN users u
  WHERE u.username IN ('alice', 'bob', 'charlie', 'admin')
    AND s.user_id != u.id  -- Users can't vote for their own suggestions
),
-- Create ranking votes for each user
vote_data AS (
  SELECT DISTINCT
    voter_id,
    voter_name,
    -- Alice ranks: Design Patterns (1pt), Refactoring (0pt)
    -- Bob ranks: Refactoring (1pt), Art of Programming (0pt) 
    -- Charlie ranks: Art of Programming (1pt), Design Patterns (0pt)
    -- Admin ranks: Design Patterns (1pt), Art of Programming (0pt)
    CASE 
      WHEN voter_name = 'alice' AND title = 'Design Patterns' THEN 1
      WHEN voter_name = 'alice' AND title = 'Refactoring' THEN 0
      WHEN voter_name = 'bob' AND title = 'Refactoring' THEN 1
      WHEN voter_name = 'bob' AND title = 'The Art of Computer Programming' THEN 0
      WHEN voter_name = 'charlie' AND title = 'The Art of Computer Programming' THEN 1
      WHEN voter_name = 'charlie' AND title = 'Design Patterns' THEN 0
      WHEN voter_name = 'admin' AND title = 'Design Patterns' THEN 1
      WHEN voter_name = 'admin' AND title = 'The Art of Computer Programming' THEN 0
      ELSE NULL
    END as points,
    suggestion_id
  FROM suggestion_user_data
)
-- Insert the votes
INSERT INTO votes (id, user_id, voting_cycle_id, book_suggestion_id, points, created_at)
SELECT 
  gen_random_uuid(),
  vote_data.voter_id,
  current_cycle.id,
  vote_data.suggestion_id,
  vote_data.points,
  NOW() - INTERVAL '2 days'
FROM vote_data, current_cycle
WHERE vote_data.points IS NOT NULL;

-- Verify the data was inserted
SELECT 'Completed voting cycle created (results phase, ranking mode):' as info;
SELECT id, suggestion_deadline, voting_deadline, voting_mode, status FROM voting_cycles;

SELECT 'Book suggestions created:' as info;
SELECT bs.title, bs.author, bs.year, u.username as suggested_by 
FROM book_suggestions bs 
JOIN users u ON bs.user_id = u.id
ORDER BY u.username;

SELECT 'Votes cast:' as info;
SELECT 
  u.username as voter,
  bs.title as book_voted_for,
  v.points,
  suggested_by.username as suggested_by
FROM votes v
JOIN users u ON v.user_id = u.id
JOIN book_suggestions bs ON v.book_suggestion_id = bs.id
JOIN users suggested_by ON bs.user_id = suggested_by.id
ORDER BY u.username, v.points DESC;

SELECT 'Vote results (total points per book):' as info;
SELECT 
  bs.title,
  bs.author,
  suggested_by.username as suggested_by,
  COALESCE(SUM(v.points), 0) as total_points
FROM book_suggestions bs
JOIN users suggested_by ON bs.user_id = suggested_by.id
LEFT JOIN votes v ON bs.id = v.book_suggestion_id
GROUP BY bs.id, bs.title, bs.author, suggested_by.username
ORDER BY total_points DESC;