-- Check User's Subscription Status in Database
-- This will show what tier the database thinks the user is on

-- Check user_profiles table for subscription tier
SELECT
  id,
  email,
  subscription_tier,
  created_at,
  updated_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 5;

-- Also check if there's a subscriptions table
SELECT
  user_id,
  tier,
  status,
  current_period_start,
  current_period_end
FROM subscriptions
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 5;
