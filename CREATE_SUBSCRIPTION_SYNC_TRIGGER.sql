-- Create automatic sync trigger from user_subscriptions to profiles
-- This ensures ALL users (not just you) get their subscription data synced

-- Drop trigger if it exists (for re-running)
DROP TRIGGER IF EXISTS sync_subscription_to_profiles_trigger ON user_subscriptions;
DROP FUNCTION IF EXISTS sync_subscription_to_profiles();

-- Create trigger function
CREATE OR REPLACE FUNCTION sync_subscription_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles table whenever user_subscriptions changes
  UPDATE profiles SET
    subscription_tier = CASE
      -- Map 'pro' to 'premium' to match profiles table constraint
      WHEN NEW.tier = 'pro' THEN 'premium'
      ELSE NEW.tier
    END,
    subscription_status = NEW.status,
    subscription_amount = CASE
      -- Calculate amount based on tier and billing cycle
      WHEN (NEW.tier = 'premium' OR NEW.tier = 'pro') AND NEW.billing_cycle = 'monthly' THEN 6.99
      WHEN (NEW.tier = 'premium' OR NEW.tier = 'pro') AND NEW.billing_cycle = 'yearly' THEN 69.99
      WHEN NEW.tier = 'unlimited' AND NEW.billing_cycle = 'monthly' THEN 12.99
      WHEN NEW.tier = 'unlimited' AND NEW.billing_cycle = 'yearly' THEN 129.99
      ELSE 0
    END,
    subscription_currency = 'GBP',  -- ✅ FIXED: user_subscriptions doesn't have currency column
    subscription_period = NEW.billing_cycle,
    subscription_period_start = NEW.subscription_start_date,
    subscription_period_end = NEW.subscription_renewal_date,
    stripe_subscription_id = NEW.stripe_subscription_id,
    stripe_customer_id = NEW.stripe_customer_id,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER sync_subscription_to_profiles_trigger
AFTER INSERT OR UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_subscription_to_profiles();

-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_subscription_to_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_subscription_to_profiles() TO service_role;

-- Test: Check if trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_subscription_to_profiles_trigger';

-- Now backfill existing subscriptions from user_subscriptions to profiles
-- This updates ALL users who already have subscriptions
UPDATE profiles p
SET
  subscription_tier = CASE
    -- Map 'pro' to 'premium' to match profiles table constraint
    WHEN us.tier = 'pro' THEN 'premium'
    ELSE us.tier
  END,
  subscription_status = us.status,
  subscription_amount = CASE
    WHEN (us.tier = 'premium' OR us.tier = 'pro') AND us.billing_cycle = 'monthly' THEN 6.99
    WHEN (us.tier = 'premium' OR us.tier = 'pro') AND us.billing_cycle = 'yearly' THEN 69.99
    WHEN us.tier = 'unlimited' AND us.billing_cycle = 'monthly' THEN 12.99
    WHEN us.tier = 'unlimited' AND us.billing_cycle = 'yearly' THEN 129.99
    ELSE 0
  END,
  subscription_currency = 'GBP',  -- ✅ FIXED: user_subscriptions doesn't have currency column
  subscription_period = us.billing_cycle,
  subscription_period_start = us.subscription_start_date,
  subscription_period_end = us.subscription_renewal_date,
  stripe_subscription_id = us.stripe_subscription_id,
  stripe_customer_id = us.stripe_customer_id,
  updated_at = NOW()
FROM user_subscriptions us
WHERE p.id = us.user_id
  AND us.status = 'active';

-- Verify the backfill worked
SELECT
  COUNT(*) as users_with_subscription_data,
  COUNT(*) FILTER (WHERE subscription_tier = 'premium') as premium_users,
  COUNT(*) FILTER (WHERE subscription_tier = 'unlimited') as unlimited_users
FROM profiles
WHERE subscription_tier IS NOT NULL
  AND subscription_tier != 'free';

-- Check your specific user
SELECT
  id,
  subscription_tier,
  subscription_status,
  subscription_amount,
  subscription_currency,
  subscription_period,
  subscription_period_start,
  subscription_period_end,
  stripe_subscription_id
FROM profiles
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';
