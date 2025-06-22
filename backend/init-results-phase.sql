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

-- Insert book suggestions
INSERT INTO book_suggestions (id, user_id, voting_cycle_id, title, author, year, page_count, link, misc_info, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'alice'),
  (SELECT id FROM voting_cycles WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1),
  'Design Patterns',
  'Gang of Four',
  1994,
  395,
  'https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612',
  'Classic book on software design patterns. Essential for object-oriented programming.',
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '6 days';

INSERT INTO book_suggestions (id, user_id, voting_cycle_id, title, author, year, page_count, link, misc_info, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'bob'),
  (SELECT id FROM voting_cycles WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1),
  'Refactoring',
  'Martin Fowler',
  1999,
  448,
  'https://martinfowler.com/books/refactoring.html',
  'The definitive guide to improving the design of existing code without changing its behavior.',
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '6 days';

INSERT INTO book_suggestions (id, user_id, voting_cycle_id, title, author, year, page_count, link, misc_info, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'charlie'),
  (SELECT id FROM voting_cycles WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1),
  'The Art of Computer Programming',
  'Donald E. Knuth',
  1968,
  650,
  'https://www-cs-faculty.stanford.edu/~knuth/taocp.html',
  'The legendary multi-volume work on computer programming. Volume 1 covers fundamental algorithms.',
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '6 days';

-- Insert votes: each user votes for 1 book (not their own)
-- Alice votes for Bob's book (Refactoring)
INSERT INTO votes (id, user_id, voting_cycle_id, book_suggestion_id, points, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'alice'),
  (SELECT id FROM voting_cycles WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM book_suggestions WHERE title = 'Refactoring'),
  1,
  NOW() - INTERVAL '2 days';

-- Bob votes for Charlie's book (The Art of Computer Programming)  
INSERT INTO votes (id, user_id, voting_cycle_id, book_suggestion_id, points, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'bob'),
  (SELECT id FROM voting_cycles WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM book_suggestions WHERE title = 'The Art of Computer Programming'),
  1,
  NOW() - INTERVAL '2 days';

-- Charlie votes for Alice's book (Design Patterns)
INSERT INTO votes (id, user_id, voting_cycle_id, book_suggestion_id, points, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'charlie'),
  (SELECT id FROM voting_cycles WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM book_suggestions WHERE title = 'Design Patterns'),
  1,
  NOW() - INTERVAL '2 days';

-- Admin votes for Alice's book (Design Patterns) 
INSERT INTO votes (id, user_id, voting_cycle_id, book_suggestion_id, points, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'admin'),
  (SELECT id FROM voting_cycles WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM book_suggestions WHERE title = 'Design Patterns'),
  1,
  NOW() - INTERVAL '2 days';

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