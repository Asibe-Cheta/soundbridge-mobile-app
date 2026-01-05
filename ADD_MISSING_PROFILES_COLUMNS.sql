-- Add missing subscription columns to profiles table
-- These columns are needed for mobile app's Supabase fallback to work correctly

-- Check current schema first
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'subscription_tier',
    'subscription_status',
    'subscription_amount',
    'subscription_currency',
    'subscription_period',
    'subscription_period_start',
    'subscription_period_end',
    'stripe_subscription_id',
    'stripe_customer_id'
  )
ORDER BY column_name;

-- Add missing columns (will skip if already exists)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS subscription_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS subscription_currency TEXT DEFAULT 'GBP',
ADD COLUMN IF NOT EXISTS subscription_period TEXT, -- 'monthly' or 'yearly'
ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier
ON profiles(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id
ON profiles(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
ON profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'subscription_tier',
    'subscription_status',
    'subscription_amount',
    'subscription_currency',
    'subscription_period',
    'subscription_period_start',
    'subscription_period_end',
    'stripe_subscription_id',
    'stripe_customer_id'
  )
ORDER BY column_name;

-- Now check if your user has any subscription data
SELECT
  id,
  subscription_tier,
  subscription_status,
  subscription_amount,
  subscription_currency,
  subscription_period,
  subscription_period_start,
  subscription_period_end,
  stripe_subscription_id,
  stripe_customer_id
FROM profiles
WHERE id = auth.uid(); -- Your current user

-- Also check user_subscriptions table to see if webhook populated it
-- Note: This query may fail if user_subscriptions table doesn't exist or has different columns
-- That's okay - it's just for verification
SELECT *
FROM user_subscriptions
WHERE user_id = auth.uid()
LIMIT 1;
