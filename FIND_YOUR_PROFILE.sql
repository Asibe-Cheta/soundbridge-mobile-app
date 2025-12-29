-- Find your profile using auth.users first
-- Step 1: Get your user ID
SELECT
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'aibechetachukwu@gmail.com';

-- Step 2: Once you have the ID from above, use it here (replace 'YOUR-USER-ID')
-- to check your profile
SELECT
  id,
  username,
  display_name,
  subscription_tier,
  subscription_status,
  subscription_renewal_date,
  revenuecat_customer_id,
  created_at
FROM profiles
WHERE id = 'YOUR-USER-ID'; -- Replace with your actual user ID from auth.users query above
