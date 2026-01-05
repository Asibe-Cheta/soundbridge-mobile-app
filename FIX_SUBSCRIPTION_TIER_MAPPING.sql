-- Fix subscription tier mapping in sync trigger
-- Issue: user_subscriptions uses 'pro' but profiles constraint expects 'premium' or 'unlimited'

-- First, check what the profiles table constraint allows
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
  AND conname LIKE '%subscription_tier%';

-- Check what tier values exist in user_subscriptions
SELECT DISTINCT tier
FROM user_subscriptions
ORDER BY tier;

-- Check your specific subscription
SELECT
  user_id,
  tier,
  status,
  billing_cycle,
  subscription_start_date,
  subscription_renewal_date,
  stripe_subscription_id
FROM user_subscriptions
WHERE user_id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

-- Check current profiles data
SELECT
  id,
  subscription_tier,
  subscription_status,
  subscription_amount,
  subscription_period
FROM profiles
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';
