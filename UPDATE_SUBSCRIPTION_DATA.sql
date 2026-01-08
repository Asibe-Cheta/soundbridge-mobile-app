-- Update your subscription details in the profiles table
-- Replace 'YOUR_USER_ID' with your actual user ID

-- First, let's check your current profile data:
SELECT
  id,
  subscription_tier,
  subscription_status,
  subscription_amount,
  subscription_currency,
  subscription_period_start,
  subscription_period_end
FROM profiles
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

-- Then update with your actual subscription details:
-- Adjust the dates and amount based on your actual subscription
UPDATE profiles
SET
  subscription_tier = 'premium',                    -- Your tier: 'premium' or 'unlimited'
  subscription_status = 'active',                    -- Status: 'active', 'cancelled', etc.
  subscription_amount = 6.99,                        -- Monthly: 6.99, Yearly: 69.99
  subscription_currency = 'GBP',                     -- Currency: 'GBP', 'USD', etc.
  subscription_period_start = '2025-12-30 00:00:00', -- Your subscription start date
  subscription_period_end = '2026-01-30 00:00:00'    -- Your next billing date (start + 1 month)
WHERE id = 'YOUR_USER_ID';

-- Verify the update:
SELECT
  id,
  subscription_tier,
  subscription_status,
  subscription_amount,
  subscription_currency,
  subscription_period_start,
  subscription_period_end
FROM profiles
WHERE id = 'YOUR_USER_ID';
