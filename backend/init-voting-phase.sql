-- Initialize database for voting phase with ranking mode
-- Run init-users.sql first to set up users

-- Clean existing voting data
DELETE FROM votes;
DELETE FROM book_suggestions;
DELETE FROM voting_cycles;

-- Create a voting cycle in voting phase with ranking mode
INSERT INTO voting_cycles (id, suggestion_deadline, voting_deadline, voting_mode, status, created_at, updated_at) VALUES
  (
    gen_random_uuid(),
    NOW() - INTERVAL '1 day', -- Suggestion deadline has passed
    NOW() + INTERVAL '1 week', -- Voting deadline is in the future
    'ranking',
    'voting',
    NOW() - INTERVAL '2 days',
    NOW()
  );

-- Get user IDs and cycle ID for creating book suggestions
WITH users_data AS (
  SELECT 
    id,
    username,
    ROW_NUMBER() OVER (ORDER BY username) as rn
  FROM users 
  WHERE username IN ('alice', 'bob', 'charlie')
),
current_cycle AS (
  SELECT id FROM voting_cycles WHERE status = 'voting' ORDER BY created_at DESC LIMIT 1
)
-- Insert three book suggestions
INSERT INTO book_suggestions (id, user_id, voting_cycle_id, title, author, year, page_count, link, misc_info, created_at, updated_at)
SELECT
  gen_random_uuid(),
  users_data.id,
  current_cycle.id,
  CASE users_data.rn
    WHEN 1 THEN 'Clean Code'
    WHEN 2 THEN 'The Phoenix Project'
    WHEN 3 THEN 'Atomic Habits'
  END,
  CASE users_data.rn
    WHEN 1 THEN 'Robert C. Martin'
    WHEN 2 THEN 'Gene Kim, Kevin Behr, George Spafford'
    WHEN 3 THEN 'James Clear'
  END,
  CASE users_data.rn
    WHEN 1 THEN 2008
    WHEN 2 THEN 2013
    WHEN 3 THEN 2018
  END,
  CASE users_data.rn
    WHEN 1 THEN 464
    WHEN 2 THEN 432
    WHEN 3 THEN 320
  END,
  CASE users_data.rn
    WHEN 1 THEN 'https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882'
    WHEN 2 THEN 'https://www.amazon.com/Phoenix-Project-DevOps-Helping-Business/dp/0988262592'
    WHEN 3 THEN 'https://jamesclear.com/atomic-habits'
  END,
  CASE users_data.rn
    WHEN 1 THEN 'Essential reading for any software developer. Teaches how to write maintainable, readable code.'
    WHEN 2 THEN 'A novel about IT, DevOps, and helping your business win. Great for understanding modern software delivery.'
    WHEN 3 THEN 'Practical strategies for building good habits and breaking bad ones. Applicable to personal and professional life.'
  END,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
FROM users_data, current_cycle;

-- Verify the data was inserted
SELECT 'Voting cycle created (voting phase, ranking mode):' as info;
SELECT id, suggestion_deadline, voting_deadline, voting_mode, status FROM voting_cycles;

SELECT 'Book suggestions created:' as info;
SELECT bs.title, bs.author, bs.year, u.username as suggested_by 
FROM book_suggestions bs 
JOIN users u ON bs.user_id = u.id
ORDER BY u.username;