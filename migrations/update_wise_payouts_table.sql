-- ============================================================================
-- WISE PAYOUTS TABLE - UPDATE MIGRATION
-- ============================================================================
-- Created: 2025-12-29
-- Purpose: Add missing columns to existing wise_payouts table created by web team
--
-- This migration adds columns that are referenced in triggers and views but
-- don't exist in the original schema created by the web team.
-- ============================================================================

-- ============================================================================
-- ADD MISSING COLUMNS
-- ============================================================================

-- Add wise_recipient_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'wise_recipient_id'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN wise_recipient_id VARCHAR(255);
  END IF;
END $$;

-- Add wise_quote_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'wise_quote_id'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN wise_quote_id VARCHAR(255);
  END IF;
END $$;

-- Add recipient_bank_name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'recipient_bank_name'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN recipient_bank_name VARCHAR(255);
  END IF;
END $$;

-- Add customer_transaction_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'customer_transaction_id'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN customer_transaction_id VARCHAR(255) UNIQUE;
  END IF;
END $$;

-- Add exchange_rate if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'exchange_rate'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN exchange_rate DECIMAL(12, 6);
  END IF;
END $$;

-- Add source_amount if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'source_amount'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN source_amount DECIMAL(10, 2);
  END IF;
END $$;

-- Add source_currency if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'source_currency'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN source_currency VARCHAR(3) DEFAULT 'USD';
  END IF;
END $$;

-- Add wise_fee if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'wise_fee'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN wise_fee DECIMAL(10, 2);
  END IF;
END $$;

-- Add error_code if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'error_code'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN error_code VARCHAR(50);
  END IF;
END $$;

-- Add wise_status_history if it doesn't exist (CRITICAL - referenced in trigger)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'wise_status_history'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN wise_status_history JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add metadata if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add failed_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = 'failed_at'
  ) THEN
    ALTER TABLE wise_payouts ADD COLUMN failed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add deleted_at if it doesn't exist (for soft deletes)
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
-- UPDATE STATUS CHECK CONSTRAINT
-- ============================================================================

-- Drop old status check constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wise_payouts_status_check'
  ) THEN
    ALTER TABLE wise_payouts DROP CONSTRAINT wise_payouts_status_check;
  END IF;
END $$;

-- Add updated status check constraint with 'refunded' status
ALTER TABLE wise_payouts DROP CONSTRAINT IF EXISTS wise_payouts_status_check;
ALTER TABLE wise_payouts ADD CONSTRAINT wise_payouts_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'));

-- ============================================================================
-- UPDATE INDEXES
-- ============================================================================

-- Add composite index for creator + status queries
CREATE INDEX IF NOT EXISTS idx_wise_payouts_creator_status
  ON wise_payouts(creator_id, status);

-- Add index for currency-based analytics
CREATE INDEX IF NOT EXISTS idx_wise_payouts_currency
  ON wise_payouts(currency);

-- Add partial index for pending payouts (commonly queried)
CREATE INDEX IF NOT EXISTS idx_wise_payouts_pending
  ON wise_payouts(created_at DESC)
  WHERE status = 'pending';

-- ============================================================================
-- UPDATE/CREATE TRIGGERS
-- ============================================================================

-- Drop existing trigger for status history if exists
DROP TRIGGER IF EXISTS trigger_wise_payout_status_history ON wise_payouts;

-- Create trigger to track status history in JSONB
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

-- Update the set_wise_payout_completed_at function to also set failed_at
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

-- ============================================================================
-- CREATE/UPDATE VIEWS
-- ============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS wise_payouts_recent_successful;
DROP VIEW IF EXISTS wise_payouts_pending_summary;
DROP VIEW IF EXISTS wise_creator_payout_stats;

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
-- CREATE/UPDATE HELPER FUNCTIONS
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
-- UPDATE PERMISSIONS
-- ============================================================================

-- Grant access to views
GRANT SELECT ON wise_payouts_recent_successful TO authenticated;
GRANT SELECT ON wise_payouts_pending_summary TO service_role;
GRANT SELECT ON wise_creator_payout_stats TO authenticated;

-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================

COMMENT ON COLUMN wise_payouts.wise_status_history IS 'Array of status changes with timestamps';
COMMENT ON COLUMN wise_payouts.metadata IS 'Additional metadata for the payout (flexible JSONB)';
COMMENT ON COLUMN wise_payouts.failed_at IS 'Timestamp when payout failed (status = failed)';
COMMENT ON COLUMN wise_payouts.deleted_at IS 'Soft delete timestamp';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check all columns exist
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(col) INTO missing_columns
  FROM (
    SELECT unnest(ARRAY[
      'wise_recipient_id', 'wise_quote_id', 'recipient_bank_name',
      'customer_transaction_id', 'exchange_rate', 'source_amount',
      'source_currency', 'wise_fee', 'error_code', 'wise_status_history',
      'metadata', 'failed_at', 'deleted_at'
    ]) AS col
  ) expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wise_payouts' AND column_name = expected.col
  );

  IF array_length(missing_columns, 1) > 0 THEN
    RAISE NOTICE 'Missing columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE 'All columns added successfully!';
  END IF;
END $$;

-- ============================================================================
-- END OF UPDATE MIGRATION
-- ============================================================================

-- Migration completed successfully!
-- This migration adds missing columns to the existing wise_payouts table
-- created by the web team, making it compatible with the mobile app code.
