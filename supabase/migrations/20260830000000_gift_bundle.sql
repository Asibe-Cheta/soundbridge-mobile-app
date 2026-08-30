-- Migration: Gift Bundle feature (GIFT_BUNDLE.MD, Item 36)
-- Date: 2026-08-30
-- A fan-side, non-refundable, non-withdrawable prepaid credit balance, spent on
-- tips to any artist. Deliberately a separate table from profiles.wallet_balance —
-- that column is the CREATOR's withdrawable earnings ledger (opposite direction
-- of money flow); reusing it here would let a Gift Bundle balance be withdrawn,
-- which the feature must never allow.

-- ─── 1. gift_bundle_balances ──────────────────────────────────────────────────
-- One row per user. Balance stored in MINOR currency units (pence/cents),
-- matching profiles.wallet_balance's convention — always convert to/from major
-- units (dollars) at the API boundary, never in the database or by the client.

CREATE TABLE IF NOT EXISTS gift_bundle_balances (
  user_id     UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance     INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency    TEXT NOT NULL DEFAULT 'USD',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gift_bundle_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gift bundle balance"
  ON gift_bundle_balances FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy for regular users — writes only happen via the
-- SECURITY DEFINER RPCs below, called by the backend with the service role.

-- ─── 2. gift_bundle_transactions ──────────────────────────────────────────────
-- Audit ledger — one row per credit (Stripe payment) or debit (tip paid from
-- the balance). reference_type/reference_id is a soft pointer (not a hard FK),
-- matching wallet_transactions' existing convention, since the specific tip
-- table a debit relates to is decided by the backend at write time.

CREATE TABLE IF NOT EXISTS gift_bundle_transactions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                    TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount                  INTEGER NOT NULL CHECK (amount > 0), -- minor units, always positive
  currency                TEXT NOT NULL DEFAULT 'USD',
  reference_type          TEXT,       -- e.g. 'stripe_payment_intent' | 'tip'
  reference_id            TEXT,       -- e.g. the payment_intent id or tip id
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_bundle_transactions_user_created
  ON gift_bundle_transactions (user_id, created_at DESC);

ALTER TABLE gift_bundle_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gift bundle transactions"
  ON gift_bundle_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ─── 3. credit_gift_bundle RPC ────────────────────────────────────────────────
-- Called by the backend after a Stripe PaymentIntent for a Gift Bundle credit
-- succeeds. Upserts the balance row and records the transaction atomically.

CREATE OR REPLACE FUNCTION credit_gift_bundle(
  p_user_id      UUID,
  p_amount       INTEGER, -- minor units
  p_currency     TEXT,
  p_payment_intent_id TEXT
)
RETURNS INTEGER -- new balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  INSERT INTO gift_bundle_balances (user_id, balance, currency)
  VALUES (p_user_id, p_amount, p_currency)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = gift_bundle_balances.balance + p_amount,
        updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO gift_bundle_transactions (user_id, type, amount, currency, reference_type, reference_id)
  VALUES (p_user_id, 'credit', p_amount, p_currency, 'stripe_payment_intent', p_payment_intent_id);

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION credit_gift_bundle(UUID, INTEGER, TEXT, TEXT)
  TO service_role;

-- ─── 4. debit_gift_bundle RPC ─────────────────────────────────────────────────
-- Called by the backend when a tip is paid from the Gift Bundle balance instead
-- of a fresh card charge. Raises if the balance is insufficient — the backend
-- must catch this and return a friendly "insufficient balance" error to the
-- client rather than letting the balance go negative (also enforced by the
-- CHECK constraint on gift_bundle_balances.balance as a second line of defence).

CREATE OR REPLACE FUNCTION debit_gift_bundle(
  p_user_id    UUID,
  p_amount     INTEGER, -- minor units
  p_tip_id     TEXT
)
RETURNS INTEGER -- new balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance     INTEGER;
BEGIN
  SELECT balance INTO v_current_balance
  FROM gift_bundle_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_gift_bundle_balance';
  END IF;

  UPDATE gift_bundle_balances
  SET    balance = balance - p_amount,
         updated_at = now()
  WHERE  user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO gift_bundle_transactions (user_id, type, amount, currency, reference_type, reference_id)
  SELECT p_user_id, 'debit', p_amount, currency, 'tip', p_tip_id
  FROM gift_bundle_balances WHERE user_id = p_user_id;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION debit_gift_bundle(UUID, INTEGER, TEXT)
  TO service_role;
