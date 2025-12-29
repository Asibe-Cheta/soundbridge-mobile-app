-- ============================================================================
-- WISE PAYOUTS TABLE - Supabase Migration
-- ============================================================================
-- Created: 2025-12-29
-- Purpose: Track Wise API payouts to creators for global withdrawals
--
-- This table stores all payout transactions made via Wise API to creators
-- in Nigeria, Ghana, Kenya, and other supported countries.
-- ============================================================================

-- Drop table if exists (for clean re-runs in development)
-- WARNING: Comment this out in production to avoid data loss!
-- DROP TABLE IF EXISTS wise_payouts CASCADE;

-- ============================================================================
-- CREATE TABLE: wise_payouts
-- ============================================================================

CREATE TABLE IF NOT EXISTS wise_payouts (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Creator reference (foreign key to profiles table)
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Payout amount details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'GHS', 'KES', 'USD', 'EUR', 'GBP')),

  -- Wise API identifiers
  wise_transfer_id VARCHAR(255) UNIQUE,
  wise_recipient_id VARCHAR(255),
  wise_quote_id VARCHAR(255),

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),

  -- Recipient bank account details
  recipient_account_number VARCHAR(50) NOT NULL,
  recipient_account_name VARCHAR(255) NOT NULL,
  recipient_bank_code VARCHAR(10) NOT NULL,
  recipient_bank_name VARCHAR(255),

  -- Reference and tracking
  reference VARCHAR(255) NOT NULL UNIQUE,
  customer_transaction_id VARCHAR(255) UNIQUE,

  -- Exchange rate and fees (for record keeping)
  exchange_rate DECIMAL(12, 6),
  source_amount DECIMAL(10, 2),
  source_currency VARCHAR(3) DEFAULT 'USD',
  wise_fee DECIMAL(10, 2),

  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(50),

  -- Full Wise API responses (for debugging and auditing)
  wise_response JSONB,
  wise_status_history JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Soft delete support
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- ALTER TABLE: Add columns if they don't exist (for existing installations)
-- ============================================================================

-- Add deleted_at column if it doesn't exist (for soft deletes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Index on creator_id for fast lookups by creator
CREATE INDEX IF NOT EXISTS idx_wise_payouts_creator_id
  ON wise_payouts(creator_id);

-- Index on wise_transfer_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_wise_payouts_wise_transfer_id
  ON wise_payouts(wise_transfer_id);

-- Index on status for filtering pending/completed payouts
CREATE INDEX IF NOT EXISTS idx_wise_payouts_status
  ON wise_payouts(status);

-- Index on created_at for date-based queries
CREATE INDEX IF NOT EXISTS idx_wise_payouts_created_at
  ON wise_payouts(created_at DESC);

-- Composite index for creator + status queries
CREATE INDEX IF NOT EXISTS idx_wise_payouts_creator_status
  ON wise_payouts(creator_id, status);

-- Index on reference for fast unique lookups
CREATE INDEX IF NOT EXISTS idx_wise_payouts_reference
  ON wise_payouts(reference);

-- Index for currency-based analytics
CREATE INDEX IF NOT EXISTS idx_wise_payouts_currency
  ON wise_payouts(currency);

-- Partial index for pending payouts (commonly queried)
CREATE INDEX IF NOT EXISTS idx_wise_payouts_pending
  ON wise_payouts(created_at DESC)
  WHERE status = 'pending';

-- ============================================================================
-- CREATE TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_wise_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wise_payouts_updated_at
  BEFORE UPDATE ON wise_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_wise_payouts_updated_at();

-- ============================================================================
-- CREATE TRIGGER: Auto-set completed_at when status changes to completed
-- ============================================================================

CREATE OR REPLACE FUNCTION set_wise_payout_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set completed_at when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at = NOW();
  END IF;

  -- Set failed_at when status changes to 'failed'
  IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    NEW.failed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wise_payout_completed_at
  BEFORE UPDATE ON wise_payouts
  FOR EACH ROW
  EXECUTE FUNCTION set_wise_payout_completed_at();

-- ============================================================================
-- CREATE TRIGGER: Track status history in JSONB
-- ============================================================================

CREATE OR REPLACE FUNCTION track_wise_payout_status_history()
RETURNS TRIGGER AS $$
DECLARE
  status_entry JSONB;
BEGIN
  -- Only track if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    status_entry = jsonb_build_object(
      'status', NEW.status,
      'timestamp', NOW(),
      'from_status', OLD.status,
      'error_message', NEW.error_message
    );

    -- Append to status history array
    NEW.wise_status_history = COALESCE(NEW.wise_status_history, '[]'::jsonb) || status_entry;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wise_payout_status_history
  BEFORE UPDATE ON wise_payouts
  FOR EACH ROW
  EXECUTE FUNCTION track_wise_payout_status_history();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE wise_payouts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payouts
CREATE POLICY "Users can view their own wise payouts"
  ON wise_payouts
  FOR SELECT
  USING (auth.uid() = creator_id);

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to wise payouts"
  ON wise_payouts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Authenticated users can only insert their own payouts
-- (This might be restricted to service role only in production)
CREATE POLICY "Users can create their own wise payouts"
  ON wise_payouts
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Policy: Users cannot update or delete payouts (only service role can)
-- This is enforced by not creating UPDATE/DELETE policies for regular users

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Recent successful payouts (last 30 days)
CREATE OR REPLACE VIEW wise_payouts_recent_successful AS
SELECT
  wp.*,
  p.username as creator_username,
  p.display_name as creator_name
FROM wise_payouts wp
LEFT JOIN profiles p ON wp.creator_id = p.id
WHERE
  wp.status = 'completed'
  AND wp.completed_at >= NOW() - INTERVAL '30 days'
  AND wp.deleted_at IS NULL
ORDER BY wp.completed_at DESC;

-- View: Pending payouts summary
CREATE OR REPLACE VIEW wise_payouts_pending_summary AS
SELECT
  currency,
  COUNT(*) as pending_count,
  SUM(amount) as total_amount,
  MIN(created_at) as oldest_pending,
  MAX(created_at) as newest_pending
FROM wise_payouts
WHERE
  status = 'pending'
  AND deleted_at IS NULL
GROUP BY currency;

-- View: Creator payout statistics
CREATE OR REPLACE VIEW wise_creator_payout_stats AS
SELECT
  creator_id,
  COUNT(*) as total_payouts,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_payouts,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_payouts,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_payouts,
  SUM(amount) FILTER (WHERE status = 'completed') as total_paid_out,
  currency,
  MAX(completed_at) as last_payout_at
FROM wise_payouts
WHERE deleted_at IS NULL
GROUP BY creator_id, currency;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get creator payouts with filters
CREATE OR REPLACE FUNCTION get_creator_wise_payouts(
  p_creator_id UUID,
  p_status VARCHAR DEFAULT NULL,
  p_currency VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  amount DECIMAL,
  currency VARCHAR,
  status VARCHAR,
  recipient_account_name VARCHAR,
  recipient_bank_name VARCHAR,
  reference VARCHAR,
  wise_transfer_id VARCHAR,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wp.id,
    wp.amount,
    wp.currency,
    wp.status,
    wp.recipient_account_name,
    wp.recipient_bank_name,
    wp.reference,
    wp.wise_transfer_id,
    wp.error_message,
    wp.created_at,
    wp.completed_at
  FROM wise_payouts wp
  WHERE
    wp.creator_id = p_creator_id
    AND wp.deleted_at IS NULL
    AND (p_status IS NULL OR wp.status = p_status)
    AND (p_currency IS NULL OR wp.currency = p_currency)
  ORDER BY wp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get pending payouts (for processing)
CREATE OR REPLACE FUNCTION get_pending_wise_payouts(
  p_limit INTEGER DEFAULT 100
)
RETURNS SETOF wise_payouts AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM wise_payouts
  WHERE
    status = 'pending'
    AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users (via RLS policies)
GRANT SELECT ON wise_payouts TO authenticated;
GRANT INSERT ON wise_payouts TO authenticated;

-- Grant full access to service role
GRANT ALL ON wise_payouts TO service_role;

-- Grant access to views
GRANT SELECT ON wise_payouts_recent_successful TO authenticated;
GRANT SELECT ON wise_payouts_pending_summary TO service_role;
GRANT SELECT ON wise_creator_payout_stats TO authenticated;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample data for testing
-- INSERT INTO wise_payouts (
--   creator_id,
--   amount,
--   currency,
--   recipient_account_number,
--   recipient_account_name,
--   recipient_bank_code,
--   recipient_bank_name,
--   reference,
--   status
-- ) VALUES (
--   (SELECT id FROM profiles LIMIT 1), -- Replace with actual creator_id
--   50000.00,
--   'NGN',
--   '0123456789',
--   'John Doe',
--   '044',
--   'Access Bank',
--   'TEST_PAYOUT_' || gen_random_uuid(),
--   'pending'
-- );

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================

COMMENT ON TABLE wise_payouts IS 'Tracks all Wise API payouts to creators for global withdrawals';
COMMENT ON COLUMN wise_payouts.id IS 'Unique identifier for the payout record';
COMMENT ON COLUMN wise_payouts.creator_id IS 'Foreign key to profiles table - the creator receiving the payout';
COMMENT ON COLUMN wise_payouts.amount IS 'Payout amount in the target currency';
COMMENT ON COLUMN wise_payouts.currency IS 'Target currency code (NGN, GHS, KES, etc.)';
COMMENT ON COLUMN wise_payouts.wise_transfer_id IS 'Wise API transfer ID (unique from Wise)';
COMMENT ON COLUMN wise_payouts.status IS 'Current payout status (pending, processing, completed, failed, cancelled)';
COMMENT ON COLUMN wise_payouts.reference IS 'Internal unique reference for this payout';
COMMENT ON COLUMN wise_payouts.wise_response IS 'Full Wise API response (JSONB) for debugging';
COMMENT ON COLUMN wise_payouts.wise_status_history IS 'Array of status changes with timestamps';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table creation
-- SELECT table_name, table_type
-- FROM information_schema.tables
-- WHERE table_name = 'wise_payouts';

-- Verify indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'wise_payouts';

-- Verify RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'wise_payouts';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Migration completed successfully!
-- Run this file using: psql -f create_wise_payouts_table.sql
-- Or via Supabase Dashboard: SQL Editor → New Query → Paste → Run
