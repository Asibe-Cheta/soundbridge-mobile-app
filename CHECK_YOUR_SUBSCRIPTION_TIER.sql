-- Check Your Subscription Tier in Database
-- Email: aibechetachukwu@gmail.com

-- Check profiles table for your subscription tier
SELECT
  id,
  email,
  username,
  subscription_tier,
  subscription_status,
  subscription_renewal_date,
  created_at,
  updated_at
FROM profiles
WHERE email = 'aibechetachukwu@gmail.com';

-- Also check auth.users to get user ID
SELECT
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'aibechetachukwu@gmail.com';
