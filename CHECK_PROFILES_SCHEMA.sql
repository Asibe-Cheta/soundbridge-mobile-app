-- Check what columns exist in the profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Get all profiles (limited to 5)
SELECT *
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- Check auth.users for your user ID
SELECT
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'aibechetachukwu@gmail.com';
