-- Update User Tier in Database to Match RevenueCat
-- This fixes the issue where UpgradeScreen shows Premium but Upload/Discover show Free

-- STEP 1: Check current user's subscription tier
SELECT
  id,
  email,
  subscription_tier,
  created_at
FROM user_profiles
WHERE email = 'your-email@example.com'; -- Replace with your actual email

-- STEP 2: Update user to Premium tier
-- Replace 'your-user-id' with your actual user ID from the query above
UPDATE user_profiles
SET
  subscription_tier = 'premium',
  updated_at = NOW()
WHERE id = 'your-user-id'; -- Replace with your actual user ID

-- STEP 3: Verify the update
SELECT
  id,
  email,
  subscription_tier,
  updated_at
FROM user_profiles
WHERE id = 'your-user-id'; -- Replace with your actual user ID

-- Expected result: subscription_tier should now be 'premium'
