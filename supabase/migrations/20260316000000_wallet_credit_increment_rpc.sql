-- Migration: Wallet credit support
-- Date: 2026-03-16
-- Adds wallet_balance column to profiles (if not present) and
-- creates the increment_wallet_balance RPC used by the
-- payment_intent.succeeded webhook handler.

-- ─── 1. Add wallet_balance to profiles ───────────────────────────────────────
-- Stores balance in minor currency units (pence / cents).
-- Defaults to 0. Kept in sync by the RPC below.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wallet_balance INTEGER NOT NULL DEFAULT 0;

-- ─── 2. increment_wallet_balance RPC ─────────────────────────────────────────
-- Called by the backend webhook after a payment_intent.succeeded event.
-- Uses UPDATE with arithmetic to avoid race conditions (no SELECT + UPDATE).
-- SECURITY DEFINER so the webhook's service-role call can write regardless
-- of RLS policies on profiles.

CREATE OR REPLACE FUNCTION increment_wallet_balance(
  p_user_id UUID,
  p_amount   INTEGER   -- in minor units (e.g. 1000 = £10.00 / $10.00)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET    wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE  id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', p_user_id;
  END IF;
END;
$$;

-- Allow the service role (used by the webhook) to call it.
GRANT EXECUTE ON FUNCTION increment_wallet_balance(UUID, INTEGER)
  TO service_role;

-- ─── 3. Manual credit for pi_3T6GcG0Bt6mXrdye10HwRyaF ────────────────────────
-- One-off fix: credit the £10 payment that was captured on 16 Mar 2026
-- but never reached the recipient's wallet due to missing webhook handler.
--
-- STEP A — find the user (run this first, confirm the id, then run B+C):
--
--   SELECT id, display_name, email, wallet_balance
--   FROM   profiles
--   WHERE  stripe_customer_id = 'gcus_1TBFvr0Bt6mXrdyehreQXM1n';
--
-- STEP B — insert the transaction (replace <USER_ID> with the id from A):

-- INSERT INTO wallet_transactions (
--   user_id,
--   transaction_type,
--   amount,
--   currency,
--   description,
--   status,
--   reference_id,
--   created_at
-- )
-- SELECT
--   id,
--   'deposit',
--   1000,
--   'GBP',
--   'Payment received — pi_3T6GcG0Bt6mXrdye10HwRyaF',
--   'completed',
--   'pi_3T6GcG0Bt6mXrdye10HwRyaF',
--   '2026-03-16T14:46:00Z'
-- FROM profiles
-- WHERE stripe_customer_id = 'gcus_1TBFvr0Bt6mXrdyehreQXM1n'
--   AND NOT EXISTS (
--     -- idempotency guard: skip if already credited
--     SELECT 1 FROM wallet_transactions
--     WHERE reference_id = 'pi_3T6GcG0Bt6mXrdye10HwRyaF'
--   );

-- STEP C — update the balance:

-- SELECT increment_wallet_balance(
--   (SELECT id FROM profiles WHERE stripe_customer_id = 'gcus_1TBFvr0Bt6mXrdyehreQXM1n'),
--   1000
-- );
