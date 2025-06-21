-- Initialize test users only
-- Clean existing users
DELETE FROM votes;
DELETE FROM book_suggestions;
DELETE FROM voting_cycles;
DELETE FROM users;

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
  ),
  (
    gen_random_uuid(),
    'charlie',
    'charlie@example.com',
    '$2b$10$CjJtWQNqRZhFyH5KxGwfE.2BDt5NhKXzJYpUvFW8wFe4rVaEn6p5.', -- password: charlie123
    false,
    NOW(),
    NOW()
  );

-- Verify users were created
SELECT 'Test users created:' as info;
SELECT username, email, is_admin FROM users ORDER BY username;