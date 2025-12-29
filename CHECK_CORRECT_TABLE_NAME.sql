-- Find the correct table name for user data
-- Check all tables in the database
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Common variations to check:
-- profiles
-- users
-- user_accounts
-- creators
-- creator_profiles
