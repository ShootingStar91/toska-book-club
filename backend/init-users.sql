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
    '$2b$10$DWwtHggGMYNV3qrVQQOZlux3frC29ImKk9BROyB1tSK3sFrfY1qKy', -- password: admin123
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'alice',
    'alice@example.com', 
    '$2b$10$03R6c2X9MStwszVS52OTJ.IIK1IVWMR6JSM.dkGnjwjJPCElkq90e', -- password: alice123
    false,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'bob',
    'bob@example.com',
    '$2b$10$dZK9st6Sz3lTwX9o8l6Nwudfxyr0tD6eKKpIZwJq2x8lhzUDv769e', -- password: bob123
    false,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'charlie',
    'charlie@example.com',
    '$2b$10$98FmBB4I8lUrDYhHe4oOYe2g29ruUtjSRZUOdfPuRnjZuBNDcWELC', -- password: charlie123
    false,
    NOW(),
    NOW()
  );

-- Verify users were created
SELECT 'Test users created:' as info;
SELECT username, email, is_admin FROM users ORDER BY username;