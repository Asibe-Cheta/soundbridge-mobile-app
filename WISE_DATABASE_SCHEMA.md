# Wise Payouts Database Schema Documentation

**Date:** 2025-12-29
**Status:** ✅ Ready for Deployment
**Database:** Supabase (PostgreSQL)

---

## Overview

This document describes the database schema for tracking Wise API payouts to creators. The schema includes the main `wise_payouts` table, indexes, triggers, RLS policies, helper views, and functions.

---

## Table of Contents

1. [Schema Diagram](#schema-diagram)
2. [wise_payouts Table](#wise_payouts-table)
3. [Indexes](#indexes)
4. [Triggers](#triggers)
5. [RLS Policies](#rls-policies)
6. [Views](#views)
7. [Helper Functions](#helper-functions)
8. [TypeScript Types](#typescript-types)
9. [Database Helper Functions](#database-helper-functions)
10. [Usage Examples](#usage-examples)

---

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      wise_payouts                            │
├─────────────────────────────────────────────────────────────┤
│ id                          UUID PK                          │
│ creator_id                  UUID FK → profiles(id)           │
│ amount                      DECIMAL(10,2)                    │
│ currency                    VARCHAR(3)                       │
│ wise_transfer_id            VARCHAR(255) UNIQUE              │
│ wise_recipient_id           VARCHAR(255)                     │
│ wise_quote_id               VARCHAR(255)                     │
│ status                      VARCHAR(20)                      │
│ recipient_account_number    VARCHAR(50)                      │
│ recipient_account_name      VARCHAR(255)                     │
│ recipient_bank_code         VARCHAR(10)                      │
│ recipient_bank_name         VARCHAR(255)                     │
│ reference                   VARCHAR(255) UNIQUE              │
│ customer_transaction_id     VARCHAR(255) UNIQUE              │
│ exchange_rate               DECIMAL(12,6)                    │
│ source_amount               DECIMAL(10,2)                    │
│ source_currency             VARCHAR(3)                       │
│ wise_fee                    DECIMAL(10,2)                    │
│ error_message               TEXT                             │
│ error_code                  VARCHAR(50)                      │
│ wise_response               JSONB                            │
│ wise_status_history         JSONB                            │
│ metadata                    JSONB                            │
│ created_at                  TIMESTAMPTZ                      │
│ updated_at                  TIMESTAMPTZ                      │
│ completed_at                TIMESTAMPTZ                      │
│ failed_at                   TIMESTAMPTZ                      │
│ deleted_at                  TIMESTAMPTZ                      │
└─────────────────────────────────────────────────────────────┘
```

---

## wise_payouts Table

### Purpose
Tracks all Wise API payout transactions to creators in supported countries (Nigeria, Ghana, Kenya, etc.).

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `creator_id` | UUID | NOT NULL, FK → profiles(id) | Creator receiving payout |
| `amount` | DECIMAL(10,2) | NOT NULL, CHECK (amount > 0) | Payout amount in target currency |
| `currency` | VARCHAR(3) | NOT NULL, CHECK (IN 'NGN','GHS','KES'...) | Currency code |
| `wise_transfer_id` | VARCHAR(255) | UNIQUE | Wise API transfer ID |
| `wise_recipient_id` | VARCHAR(255) | | Wise API recipient ID |
| `wise_quote_id` | VARCHAR(255) | | Wise API quote ID |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | Payout status |
| `recipient_account_number` | VARCHAR(50) | NOT NULL | Bank account number |
| `recipient_account_name` | VARCHAR(255) | NOT NULL | Account holder name |
| `recipient_bank_code` | VARCHAR(10) | NOT NULL | Bank code (e.g., '044') |
| `recipient_bank_name` | VARCHAR(255) | | Bank name (e.g., 'Access Bank') |
| `reference` | VARCHAR(255) | NOT NULL, UNIQUE | Internal unique reference |
| `customer_transaction_id` | VARCHAR(255) | UNIQUE | Idempotency key for Wise API |
| `exchange_rate` | DECIMAL(12,6) | | Exchange rate used |
| `source_amount` | DECIMAL(10,2) | | Amount in source currency (USD) |
| `source_currency` | VARCHAR(3) | DEFAULT 'USD' | Source currency |
| `wise_fee` | DECIMAL(10,2) | | Wise processing fee |
| `error_message` | TEXT | | Error message if failed |
| `error_code` | VARCHAR(50) | | Error code if failed |
| `wise_response` | JSONB | | Full Wise API response |
| `wise_status_history` | JSONB | DEFAULT '[]' | Array of status changes |
| `metadata` | JSONB | DEFAULT '{}' | Additional metadata |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time |
| `completed_at` | TIMESTAMPTZ | | Completion timestamp |
| `failed_at` | TIMESTAMPTZ | | Failure timestamp |
| `deleted_at` | TIMESTAMPTZ | | Soft delete timestamp |

### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Payout created but not yet sent to Wise |
| `processing` | Payout is being processed by Wise |
| `completed` | Payout successfully completed |
| `failed` | Payout failed (error occurred) |
| `cancelled` | Payout was cancelled |
| `refunded` | Payout was refunded |

### Supported Currencies

| Currency | Country | Symbol |
|----------|---------|--------|
| `NGN` | Nigeria | ₦ |
| `GHS` | Ghana | GH₵ |
| `KES` | Kenya | KES |
| `USD` | United States | $ |
| `EUR` | Eurozone | € |
| `GBP` | United Kingdom | £ |

---

## Indexes

```sql
-- Primary lookups
CREATE INDEX idx_wise_payouts_creator_id ON wise_payouts(creator_id);
CREATE INDEX idx_wise_payouts_wise_transfer_id ON wise_payouts(wise_transfer_id);
CREATE INDEX idx_wise_payouts_status ON wise_payouts(status);
CREATE INDEX idx_wise_payouts_created_at ON wise_payouts(created_at DESC);

-- Composite indexes
CREATE INDEX idx_wise_payouts_creator_status ON wise_payouts(creator_id, status);

-- Unique constraints
CREATE INDEX idx_wise_payouts_reference ON wise_payouts(reference);

-- Analytics
CREATE INDEX idx_wise_payouts_currency ON wise_payouts(currency);

-- Partial index for pending (frequently queried)
CREATE INDEX idx_wise_payouts_pending ON wise_payouts(created_at DESC)
  WHERE status = 'pending';
```

**Performance Notes:**
- `creator_id` index: Fast lookups for user's payout history
- `wise_transfer_id` index: Fast webhook processing
- `status` index: Efficient filtering by status
- `creator_status` composite: Optimized for "get pending payouts for user" queries
- Partial index on pending: Reduces index size for common query

---

## Triggers

### 1. Auto-update `updated_at` Timestamp

```sql
CREATE TRIGGER trigger_wise_payouts_updated_at
  BEFORE UPDATE ON wise_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_wise_payouts_updated_at();
```

**Purpose:** Automatically sets `updated_at = NOW()` on every update.

### 2. Auto-set Completion Timestamps

```sql
CREATE TRIGGER trigger_wise_payout_completed_at
  BEFORE UPDATE ON wise_payouts
  FOR EACH ROW
  EXECUTE FUNCTION set_wise_payout_completed_at();
```

**Purpose:**
- Sets `completed_at = NOW()` when status changes to 'completed'
- Sets `failed_at = NOW()` when status changes to 'failed'

### 3. Track Status History

```sql
CREATE TRIGGER trigger_wise_payout_status_history
  BEFORE UPDATE ON wise_payouts
  FOR EACH ROW
  EXECUTE FUNCTION track_wise_payout_status_history();
```

**Purpose:** Appends status change to `wise_status_history` JSONB array:

```json
[
  {
    "status": "processing",
    "timestamp": "2025-12-29T10:00:00Z",
    "from_status": "pending",
    "error_message": null
  },
  {
    "status": "completed",
    "timestamp": "2025-12-29T10:05:00Z",
    "from_status": "processing",
    "error_message": null
  }
]
```

---

## RLS Policies

### Enabled

```sql
ALTER TABLE wise_payouts ENABLE ROW LEVEL SECURITY;
```

### Policies

#### 1. Users Can View Their Own Payouts

```sql
CREATE POLICY "Users can view their own wise payouts"
  ON wise_payouts
  FOR SELECT
  USING (auth.uid() = creator_id);
```

#### 2. Service Role Has Full Access

```sql
CREATE POLICY "Service role has full access to wise payouts"
  ON wise_payouts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

#### 3. Users Can Create Their Own Payouts

```sql
CREATE POLICY "Users can create their own wise payouts"
  ON wise_payouts
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);
```

**Note:** Users cannot UPDATE or DELETE payouts (only service role can).

---

## Views

### 1. Recent Successful Payouts (Last 30 Days)

```sql
CREATE VIEW wise_payouts_recent_successful AS
SELECT
  wp.*,
  p.full_name as creator_name,
  p.email as creator_email
FROM wise_payouts wp
LEFT JOIN profiles p ON wp.creator_id = p.id
WHERE
  wp.status = 'completed'
  AND wp.completed_at >= NOW() - INTERVAL '30 days'
  AND wp.deleted_at IS NULL
ORDER BY wp.completed_at DESC;
```

**Usage:** Dashboard showing recent successful payouts

### 2. Pending Payouts Summary

```sql
CREATE VIEW wise_payouts_pending_summary AS
SELECT
  currency,
  COUNT(*) as pending_count,
  SUM(amount) as total_amount,
  MIN(created_at) as oldest_pending,
  MAX(created_at) as newest_pending
FROM wise_payouts
WHERE status = 'pending' AND deleted_at IS NULL
GROUP BY currency;
```

**Usage:** Admin dashboard showing pending payout metrics

### 3. Creator Payout Statistics

```sql
CREATE VIEW wise_creator_payout_stats AS
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
```

**Usage:** Creator profile showing payout history stats

---

## Helper Functions

### 1. Get Creator Payouts with Filters

```sql
CREATE FUNCTION get_creator_wise_payouts(
  p_creator_id UUID,
  p_status VARCHAR DEFAULT NULL,
  p_currency VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (...) AS $$
...
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage:**
```sql
SELECT * FROM get_creator_wise_payouts('uuid-here', 'completed', 'NGN', 10, 0);
```

### 2. Get Pending Payouts (For Processing)

```sql
CREATE FUNCTION get_pending_wise_payouts(
  p_limit INTEGER DEFAULT 100
)
RETURNS SETOF wise_payouts AS $$
...
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage:**
```sql
SELECT * FROM get_pending_wise_payouts(50);
```

---

## TypeScript Types

### Location
[src/lib/types/wise.ts](src/lib/types/wise.ts)

### Main Types

```typescript
// Database record type
interface WisePayout {
  id: string;
  creator_id: string;
  amount: number;
  currency: WisePayoutCurrency;
  wise_transfer_id: string | null;
  status: WisePayoutStatus;
  recipient_account_number: string;
  recipient_account_name: string;
  recipient_bank_code: string;
  reference: string;
  // ... (see file for full definition)
}

// Status enum
enum WisePayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// Webhook payload
interface WiseWebhookPayload {
  subscriptionId: string;
  eventId: string;
  profileId: number;
  eventType: 'transfers#state-change' | ...;
  data: { ... };
}
```

---

## Database Helper Functions

### Location
[src/lib/wise/database.ts](src/lib/wise/database.ts)

### Available Functions

```typescript
// Create payout record
createPayoutRecord(params: CreatePayoutParams): Promise<PayoutOperationResult>

// Update payout status
updatePayoutStatus(params: UpdatePayoutStatusParams): Promise<PayoutOperationResult>

// Get creator payouts
getCreatorPayouts(filters: GetCreatorPayoutsFilters): Promise<PayoutOperationResult>

// Get pending payouts
getPendingPayouts(limit?: number): Promise<PayoutOperationResult>

// Get payout by ID
getPayoutById(payout_id: string): Promise<PayoutOperationResult>

// Get payout by Wise transfer ID
getPayoutByWiseTransferId(wise_transfer_id: string): Promise<PayoutOperationResult>

// Get payout by reference
getPayoutByReference(reference: string): Promise<PayoutOperationResult>

// Get creator stats
getCreatorPayoutStats(creator_id: string): Promise<PayoutOperationResult>

// Get pending summary
getPendingPayoutsSummary(): Promise<PayoutOperationResult>

// Soft delete payout
deletePayoutRecord(payout_id: string): Promise<PayoutOperationResult>
```

---

## Usage Examples

### 1. Create Payout Record

```typescript
import { createPayoutRecord } from '@/lib/wise/database';

const result = await createPayoutRecord({
  creator_id: 'uuid-here',
  amount: 50000,
  currency: 'NGN',
  recipient_account_number: '0123456789',
  recipient_account_name: 'John Doe',
  recipient_bank_code: '044',
  recipient_bank_name: 'Access Bank',
  reference: `PAYOUT_${userId}_${Date.now()}`,
  customer_transaction_id: `soundbridge_${userId}_${Date.now()}`,
  metadata: {
    user_tier: 'premium',
    source: 'wallet_withdrawal',
  },
});

if (result.success) {
  console.log('Payout created:', result.data.id);
}
```

### 2. Update Status After Wise API Call

```typescript
import { updatePayoutStatus } from '@/lib/wise/database';
import { createTransfer } from '@/lib/wise';

// Create transfer via Wise API
const transfer = await createTransfer({
  targetCurrency: 'NGN',
  targetAmount: 50000,
  recipientId: 12345678,
  reference: result.data.reference,
});

// Update database with Wise response
await updatePayoutStatus({
  payout_id: result.data.id,
  status: 'processing',
  wise_transfer_id: transfer.id.toString(),
  wise_recipient_id: transfer.targetAccount.toString(),
  wise_quote_id: transfer.quoteUuid,
  exchange_rate: transfer.rate,
  source_amount: transfer.sourceValue,
  source_currency: transfer.sourceCurrency,
  wise_fee: transfer.fee,
  wise_response: { transfer },
});
```

### 3. Get Creator Payout History

```typescript
import { getCreatorPayouts } from '@/lib/wise/database';

const result = await getCreatorPayouts({
  creator_id: 'uuid-here',
  status: 'completed',
  currency: 'NGN',
  limit: 10,
});

if (result.success && result.data) {
  for (const payout of result.data) {
    console.log(`${payout.currency} ${payout.amount} - ${payout.status}`);
  }
}
```

### 4. Process Webhook Event

```typescript
import { getPayoutByWiseTransferId, updatePayoutStatus } from '@/lib/wise/database';
import { mapWiseStatusToPayoutStatus } from '@/lib/types/wise';

// Webhook handler
async function handleWiseWebhook(payload: WiseWebhookPayload) {
  const transferId = payload.resourceId.toString();

  // Find payout in database
  const result = await getPayoutByWiseTransferId(transferId);

  if (!result.success || !result.data) {
    console.error('Payout not found for transfer:', transferId);
    return;
  }

  // Map Wise status to our status
  const newStatus = mapWiseStatusToPayoutStatus(payload.data.current_state);

  // Update payout
  await updatePayoutStatus({
    payout_id: result.data.id,
    status: newStatus,
    wise_response: payload,
  });

  console.log('Payout updated:', result.data.id, '->', newStatus);
}
```

---

## Migration Instructions

### 1. Run Migration

**Via Supabase Dashboard:**
1. Go to SQL Editor
2. Click "New Query"
3. Paste contents of `migrations/create_wise_payouts_table.sql`
4. Click "Run"

**Via CLI:**
```bash
psql -h db.your-project.supabase.co -U postgres -d postgres -f migrations/create_wise_payouts_table.sql
```

### 2. Verify Migration

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'wise_payouts';

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'wise_payouts';

-- Check RLS policies
SELECT policyname FROM pg_policies
WHERE tablename = 'wise_payouts';

-- Check views
SELECT table_name FROM information_schema.views
WHERE table_name LIKE 'wise_%';
```

### 3. Test Basic Operations

```sql
-- Insert test record (replace creator_id with actual ID)
INSERT INTO wise_payouts (
  creator_id, amount, currency,
  recipient_account_number, recipient_account_name,
  recipient_bank_code, recipient_bank_name, reference
) VALUES (
  'your-creator-uuid-here',
  50000, 'NGN',
  '0123456789', 'Test User',
  '044', 'Access Bank',
  'TEST_' || gen_random_uuid()
);

-- Query test record
SELECT * FROM wise_payouts ORDER BY created_at DESC LIMIT 1;

-- Update status
UPDATE wise_payouts
SET status = 'completed'
WHERE reference LIKE 'TEST_%';

-- Verify status history was tracked
SELECT wise_status_history FROM wise_payouts
WHERE reference LIKE 'TEST_%';

-- Clean up test data
DELETE FROM wise_payouts WHERE reference LIKE 'TEST_%';
```

---

## Monitoring & Analytics

### Key Queries

**Daily payout volume:**
```sql
SELECT
  DATE(created_at) as date,
  currency,
  COUNT(*) as payouts,
  SUM(amount) as total_amount,
  COUNT(*) FILTER (WHERE status = 'completed') as successful
FROM wise_payouts
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), currency
ORDER BY date DESC;
```

**Pending payouts needing attention:**
```sql
SELECT *
FROM wise_payouts
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at ASC;
```

**Failure rate:**
```sql
SELECT
  currency,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed') / COUNT(*), 2) as failure_rate_pct
FROM wise_payouts
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY currency;
```

---

## Security Considerations

1. **RLS Enabled:** Users can only view their own payouts
2. **Service Role Required:** Only backend can create/update payouts
3. **Soft Deletes:** Uses `deleted_at` instead of hard deletes
4. **Audit Trail:** `wise_status_history` tracks all changes
5. **No PII in Logs:** Sensitive data stored in encrypted columns

---

## Backup & Recovery

**Recommended:**
- Enable Supabase automatic backups (daily)
- Export critical data weekly
- Test restore procedures monthly

**Manual Backup:**
```bash
pg_dump -h db.your-project.supabase.co -U postgres \
  -t wise_payouts -t wise_creator_payout_stats \
  -f wise_payouts_backup_$(date +%Y%m%d).sql
```

---

## Troubleshooting

**Issue: RLS blocking inserts**
- Solution: Use service role key, not anon key

**Issue: Duplicate reference error**
- Solution: Ensure reference is unique (use UUID or timestamp)

**Issue: Foreign key violation**
- Solution: Ensure creator_id exists in profiles table

**Issue: Trigger not firing**
- Solution: Check trigger is enabled: `SELECT tgenabled FROM pg_trigger WHERE tgname = 'trigger_wise_payout_status_history';`

---

**Last Updated:** 2025-12-29

**Status:** ✅ Production Ready

---

**END OF DOCUMENTATION**
