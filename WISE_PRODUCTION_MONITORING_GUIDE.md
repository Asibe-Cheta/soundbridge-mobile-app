# Wise Payout Production Monitoring & Debugging Guide

**Date:** December 29, 2025
**Status:** Production Ready
**Audience:** Mobile Team, Backend Team, DevOps

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Dashboard](#monitoring-dashboard)
3. [Key Metrics to Track](#key-metrics-to-track)
4. [Database Queries for Monitoring](#database-queries-for-monitoring)
5. [Vercel Logs Monitoring](#vercel-logs-monitoring)
6. [Wise Dashboard Monitoring](#wise-dashboard-monitoring)
7. [Alert Setup](#alert-setup)
8. [Common Issues & Debugging](#common-issues--debugging)
9. [Troubleshooting Flowcharts](#troubleshooting-flowcharts)
10. [Performance Optimization](#performance-optimization)
11. [Security Monitoring](#security-monitoring)
12. [Incident Response](#incident-response)

---

## Overview

This guide provides comprehensive monitoring and debugging procedures for the Wise payout system in production. It covers real-time monitoring, alerting, troubleshooting, and incident response.

### System Architecture

```
Mobile App
    ↓
payoutToCreator()
    ↓
Database (wise_payouts table)
    ↓
Wise API
    ↓
Webhook (status updates)
    ↓
Database (status updated)
    ↓
Mobile App (displays updated status)
```

---

## Monitoring Dashboard

### Recommended Tools

1. **Supabase Dashboard** - Database monitoring
2. **Vercel Dashboard** - Webhook logs and function metrics
3. **Wise Dashboard** - Transfer status and balance
4. **Custom Admin Panel** - Consolidated view (recommended to build)

### Dashboard Metrics

Create a dashboard showing:

- **Last 24 Hours:**
  - Total payouts initiated
  - Success rate (%)
  - Total amount paid out (by currency)
  - Failed payouts count
  - Pending payouts count

- **Current Status:**
  - Wise account balance
  - Webhook health (last received event timestamp)
  - Oldest pending payout
  - Stuck payouts (pending > 1 hour)

- **Trends:**
  - Daily payout volume (last 30 days)
  - Success rate over time
  - Average payout amount
  - Most common error codes

---

## Key Metrics to Track

### 1. Success Rate
**Target:** >95%
**Formula:** `(completed_count / total_count) * 100`

```sql
-- Success rate (last 24 hours)
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate,
  COUNT(*) as total_payouts,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending
FROM wise_payouts
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND deleted_at IS NULL;
```

### 2. Average Processing Time
**Target:** <5 minutes from creation to completion

```sql
-- Average time from creation to completion (last 24 hours)
SELECT
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) / 60 as avg_minutes
FROM wise_payouts
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND completed_at IS NOT NULL
  AND deleted_at IS NULL;
```

### 3. Failure Rate by Error Code
**Track:** Most common failure reasons

```sql
-- Failure breakdown by error code (last 7 days)
SELECT
  error_code,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage,
  SUM(amount) as total_amount_failed,
  currency
FROM wise_payouts
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '7 days'
  AND deleted_at IS NULL
GROUP BY error_code, currency
ORDER BY count DESC;
```

### 4. Webhook Latency
**Target:** <30 seconds from transfer creation to webhook received

```sql
-- Webhook latency (time between transfer creation and first webhook update)
SELECT
  wp.id,
  wp.created_at as payout_created,
  (wp.wise_status_history->0->>'timestamp')::timestamptz as first_webhook,
  EXTRACT(EPOCH FROM (
    (wp.wise_status_history->0->>'timestamp')::timestamptz - wp.created_at
  )) as latency_seconds
FROM wise_payouts wp
WHERE jsonb_array_length(wp.wise_status_history) > 0
  AND wp.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY wp.created_at DESC
LIMIT 50;
```

### 5. Balance Monitoring
**Alert Threshold:** Balance < $1,000 USD equivalent

```sql
-- Current Wise balance (query via API)
-- Use script: node scripts/check-wise-balance.js
```

---

## Database Queries for Monitoring

### Daily Operations Queries

#### 1. Pending Payouts Older Than 1 Hour
```sql
-- CRITICAL: These should be investigated immediately
SELECT
  id,
  creator_id,
  amount,
  currency,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as age_minutes,
  wise_transfer_id,
  error_message
FROM wise_payouts
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour'
  AND deleted_at IS NULL
ORDER BY created_at ASC;
```

#### 2. Failed Payouts Today
```sql
SELECT
  id,
  creator_id,
  amount,
  currency,
  error_code,
  error_message,
  created_at,
  failed_at
FROM wise_payouts
WHERE status = 'failed'
  AND DATE(created_at) = CURRENT_DATE
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

#### 3. Payouts by Status (Real-time)
```sql
SELECT
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  currency
FROM wise_payouts
WHERE DATE(created_at) = CURRENT_DATE
  AND deleted_at IS NULL
GROUP BY status, currency
ORDER BY status, currency;
```

#### 4. Top Creators by Payout Volume
```sql
-- Top 10 creators by payout count (last 30 days)
SELECT
  wp.creator_id,
  p.username,
  p.display_name,
  COUNT(*) as payout_count,
  SUM(wp.amount) as total_amount,
  wp.currency
FROM wise_payouts wp
LEFT JOIN profiles p ON wp.creator_id = p.id
WHERE wp.created_at >= NOW() - INTERVAL '30 days'
  AND wp.status = 'completed'
  AND wp.deleted_at IS NULL
GROUP BY wp.creator_id, p.username, p.display_name, wp.currency
ORDER BY total_amount DESC
LIMIT 10;
```

#### 5. Retryable Failed Payouts
```sql
-- Failed payouts that can be retried
SELECT
  id,
  creator_id,
  amount,
  currency,
  error_code,
  error_message,
  created_at
FROM wise_payouts
WHERE status = 'failed'
  AND error_code IN ('RATE_LIMIT_EXCEEDED', 'TIMEOUT', 'NETWORK_ERROR', 'SERVER_ERROR')
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

#### 6. Status History Analysis
```sql
-- Average time in each status
SELECT
  id,
  reference,
  jsonb_array_length(wise_status_history) as status_changes,
  wise_status_history
FROM wise_payouts
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND status = 'completed'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

### Weekly/Monthly Reports

#### 7. Weekly Summary
```sql
-- Weekly payout summary
SELECT
  DATE_TRUNC('week', created_at) as week,
  currency,
  COUNT(*) as total_payouts,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  SUM(amount) as total_amount,
  SUM(amount) FILTER (WHERE status = 'completed') as amount_paid,
  AVG(amount) as avg_amount
FROM wise_payouts
WHERE created_at >= NOW() - INTERVAL '12 weeks'
  AND deleted_at IS NULL
GROUP BY DATE_TRUNC('week', created_at), currency
ORDER BY week DESC, currency;
```

#### 8. Monthly Cost Analysis
```sql
-- Monthly Wise fees and costs
SELECT
  DATE_TRUNC('month', created_at) as month,
  currency,
  COUNT(*) as total_transfers,
  SUM(amount) as total_amount_sent,
  SUM(wise_fee) as total_wise_fees,
  SUM(wise_fee) * 100.0 / NULLIF(SUM(amount), 0) as fee_percentage
FROM wise_payouts
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '12 months'
  AND deleted_at IS NULL
GROUP BY DATE_TRUNC('month', created_at), currency
ORDER BY month DESC, currency;
```

---

## Vercel Logs Monitoring

### Accessing Logs

1. Go to [Vercel Dashboard](https://vercel.com/soundbridge)
2. Navigate to your project
3. Click "Logs" in the sidebar
4. Filter by function: Select webhook function

### What to Look For

#### Successful Webhook Events
```
✅ "Wise webhook POST request received"
✅ "Wise webhook event: transfers#state-change"
✅ "Updated payout status to: completed"
```

#### Warning Signs
```
⚠️ "Missing signature header"
⚠️ "Signature verification failed"
⚠️ "Transfer ID not found in database"
⚠️ "Failed to update payout status"
```

#### Critical Errors
```
❌ "Wise webhook error:"
❌ "Database error:"
❌ "Invalid event format"
```

### Log Query Examples

**Filter by time range:**
```
timestamp:>2025-12-29T00:00:00Z timestamp:<2025-12-29T23:59:59Z
```

**Filter by keyword:**
```
"Wise webhook" AND "error"
```

**Filter by status:**
```
"status: completed"
```

### Setting Up Log Alerts

Configure Vercel to send alerts for:
- Error rate >5% in 5 minutes
- No webhook events received in 1 hour (during business hours)
- Repeated signature verification failures

---

## Wise Dashboard Monitoring

### Daily Checks

1. **Account Balance**
   - Go to [Wise Dashboard](https://wise.com/)
   - Check balance for each currency
   - Alert if any balance < threshold

2. **Recent Transfers**
   - Review last 10 transfers
   - Check for any "Cancelled" or "Bounced back" statuses
   - Investigate any issues

3. **Webhook Delivery**
   - Check webhook subscription status
   - Verify webhook is active
   - Review delivery history

### Balance Monitoring Script

Create and schedule this script to run daily:

```javascript
// scripts/check-wise-balance.js
require('dotenv').config();

async function checkWiseBalance() {
  const response = await fetch(
    `https://api.wise.com/v3/profiles/${process.env.WISE_PROFILE_ID}/balances?types=STANDARD`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`,
      },
    }
  );

  const balances = await response.json();

  console.log('Current Wise Balances:');
  balances.forEach((balance) => {
    console.log(`${balance.currency}: ${balance.amount.value}`);

    // Alert thresholds
    const thresholds = {
      USD: 1000,
      EUR: 1000,
      GBP: 1000,
      NGN: 500000,
      GHS: 5000,
      KES: 100000,
    };

    if (balance.amount.value < (thresholds[balance.currency] || 0)) {
      console.warn(`⚠️ LOW BALANCE: ${balance.currency} is below threshold!`);
      // Send alert email/SMS here
    }
  });
}

checkWiseBalance();
```

---

## Alert Setup

### Critical Alerts (Immediate Response Required)

#### 1. Wise Balance Below Threshold
**Trigger:** Balance < $1,000 USD (or equivalent)
**Action:** Top up account immediately
**Notification:** Email + SMS to admin

#### 2. High Failure Rate
**Trigger:** >10% failures in last hour
**Action:** Investigate immediately
**Notification:** Email to dev team

#### 3. Webhook Stopped Working
**Trigger:** No webhook events received in 1 hour (during business hours)
**Action:** Check Vercel deployment, webhook subscription
**Notification:** Email + Slack to dev team

#### 4. Database Connection Error
**Trigger:** Multiple "Database error" logs in 5 minutes
**Action:** Check Supabase status, connection pool
**Notification:** Email + SMS to dev team

### Warning Alerts (Review Within 1 Hour)

#### 5. Stuck Pending Payouts
**Trigger:** Payout pending >1 hour
**Action:** Check Wise transfer status manually
**Notification:** Email to admin

#### 6. Repeated Signature Verification Failures
**Trigger:** >5 signature failures in 10 minutes
**Action:** Verify `WISE_WEBHOOK_SECRET` matches Wise configuration
**Notification:** Email to dev team

#### 7. Rate Limit Hit
**Trigger:** 429 error from Wise API
**Action:** Reduce concurrent requests
**Notification:** Email to dev team

### Info Alerts (Review Daily)

#### 8. Daily Payout Summary
**Trigger:** End of day (midnight)
**Content:**
- Total payouts
- Success rate
- Total amount paid
- Failed payouts count

**Notification:** Email to admin

---

## Common Issues & Debugging

### Issue 1: Payout Stuck in "Pending"

**Symptoms:**
- Payout created >1 hour ago
- Status still "pending"
- No webhook updates received

**Debug Steps:**

1. **Check if Wise transfer was created:**
   ```sql
   SELECT id, wise_transfer_id, created_at
   FROM wise_payouts
   WHERE id = 'PAYOUT_ID';
   ```

   - If `wise_transfer_id` is NULL → Transfer creation failed
   - If `wise_transfer_id` exists → Transfer created, check Wise

2. **Check Wise transfer status manually:**
   ```bash
   curl "https://api.wise.com/v1/transfers/TRANSFER_ID" \
     -H "Authorization: Bearer $WISE_API_TOKEN"
   ```

3. **Check webhook delivery in Wise Dashboard:**
   - Go to Settings → Webhooks
   - Click on webhook subscription
   - View delivery history
   - Check for failed deliveries

4. **Check Vercel logs:**
   - Search for transfer ID
   - Look for webhook events
   - Check for errors

5. **Manual status update (if webhook failed):**
   ```sql
   -- Get current Wise status first, then update
   UPDATE wise_payouts
   SET status = 'completed', -- or actual status from Wise
       completed_at = NOW()
   WHERE id = 'PAYOUT_ID';
   ```

---

### Issue 2: "Insufficient Balance" Errors

**Symptoms:**
- Multiple payouts failing with "insufficient balance"
- Error code: `INSUFFICIENT_BALANCE`

**Debug Steps:**

1. **Check Wise balance:**
   ```bash
   node scripts/check-wise-balance.js
   ```

2. **Check pending payouts total:**
   ```sql
   SELECT
     currency,
     SUM(amount) as total_pending,
     COUNT(*) as count
   FROM wise_payouts
   WHERE status = 'pending'
   GROUP BY currency;
   ```

3. **Action:**
   - Top up Wise account
   - Retry failed payouts after top-up

---

### Issue 3: Webhook Signature Verification Failing

**Symptoms:**
- Vercel logs show "Signature verification failed"
- Payouts not updating to completed status

**Debug Steps:**

1. **Verify webhook secret matches:**
   ```bash
   # Check Vercel environment variable
   vercel env pull
   cat .env.local | grep WISE_WEBHOOK_SECRET

   # Compare with Wise webhook subscription
   node scripts/list-wise-webhooks.js
   ```

2. **Check webhook subscription:**
   - Ensure subscription ID in .env matches actual subscription
   - Verify webhook URL is correct

3. **Test webhook manually:**
   ```bash
   node scripts/test-wise-webhook.js
   ```

4. **Re-create webhook if needed:**
   ```bash
   # Delete old webhook
   curl -X DELETE "https://api.wise.com/v3/profiles/$WISE_PROFILE_ID/subscriptions/$OLD_SUBSCRIPTION_ID" \
     -H "Authorization: Bearer $WISE_API_TOKEN"

   # Create new one
   node scripts/create-wise-webhook.js
   ```

---

### Issue 4: High Rate of "Invalid Bank Account" Errors

**Symptoms:**
- Multiple payouts failing with "invalid account"
- Error code: `INVALID_ACCOUNT`

**Debug Steps:**

1. **Identify affected creators:**
   ```sql
   SELECT
     creator_id,
     recipient_account_number,
     recipient_bank_code,
     COUNT(*) as failure_count
   FROM wise_payouts
   WHERE error_code = 'INVALID_ACCOUNT'
     AND created_at >= NOW() - INTERVAL '7 days'
   GROUP BY creator_id, recipient_account_number, recipient_bank_code
   ORDER BY failure_count DESC;
   ```

2. **Verify bank account details:**
   - Contact creator to confirm account number
   - Verify bank code is correct
   - Check account number length (10 digits for Nigeria)

3. **Test account verification:**
   ```typescript
   import { resolveAccount } from '@/lib/wise';

   const result = await resolveAccount({
     accountNumber: '0123456789',
     bankCode: '044',
     currency: 'NGN',
   });

   console.log(result);
   ```

4. **Update creator's bank details and retry:**
   ```sql
   -- After confirming correct details
   UPDATE wise_payouts
   SET status = 'pending',
       error_message = NULL,
       error_code = NULL
   WHERE id = 'PAYOUT_ID';
   ```

---

### Issue 5: Webhook Events Received but Database Not Updating

**Symptoms:**
- Vercel logs show webhook received
- But payout status not changing in database

**Debug Steps:**

1. **Check webhook logs for database errors:**
   - Look for "Database error" in Vercel logs
   - Check for permission errors

2. **Verify transfer ID exists in database:**
   ```sql
   SELECT id, wise_transfer_id, status
   FROM wise_payouts
   WHERE wise_transfer_id = 'TRANSFER_ID_FROM_WEBHOOK';
   ```

3. **Check service role permissions:**
   - Ensure webhook uses service role key (bypasses RLS)
   - Verify RLS policies allow updates

4. **Test database update manually:**
   ```sql
   UPDATE wise_payouts
   SET status = 'completed',
       completed_at = NOW()
   WHERE wise_transfer_id = 'TRANSFER_ID';
   ```

---

## Troubleshooting Flowcharts

### Payout Creation Failure Flowchart

```
Payout creation failed
    ↓
Check error code
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│                 │                 │                 │
MISSING_PARAMS   CREATOR_NOT_FOUND  INVALID_BANK     INSUFFICIENT_BALANCE
│                 │                 │                 │
Fix parameters   Verify creator ID  Verify bank      Top up Wise account
                                    details
```

### Webhook Not Updating Status Flowchart

```
Payout stuck in "pending"
    ↓
Check wise_transfer_id in database
    ↓
┌────────────────────────┬────────────────────────┐
│                        │                        │
NULL                    Has value
│                        │
Transfer creation       Check Wise API
failed                  for transfer status
│                        │
Check error_message     ┌──────────┬──────────┐
in database             │          │          │
                     Transfer   Transfer    Transfer
                     completed  processing  failed
                        │          │          │
                     Webhook    Wait for    Update
                     failed     webhook     manually
                        │
                     Check Vercel
                     logs
                        │
                     ┌──────┬──────┐
                     │      │      │
                  Found   Not    Signature
                         found   failed
                     │      │      │
                  Manual  Check   Fix webhook
                  update  webhook secret
                         subscription
```

---

## Performance Optimization

### 1. Reduce Database Queries

**Problem:** Too many database round trips slowing down payouts

**Solution:**
- Use batch queries for multiple payouts
- Cache frequently accessed data (bank codes, etc.)

### 2. Optimize Concurrent Batch Payouts

**Current:** `maxConcurrent: 5`

**Tuning:**
- Monitor Wise API rate limits
- Increase if no rate limit errors
- Decrease if hitting rate limits

```typescript
// Optimal based on testing
const result = await batchPayout(payouts, {
  maxConcurrent: 10, // Increase from 5 to 10 if no issues
  stopOnError: false,
});
```

### 3. Implement Caching for Bank Codes

```typescript
// Cache bank codes to avoid repeated lookups
const bankCodeCache = new Map<string, string>();

function getBankName(code: string, currency: string): string {
  const key = `${currency}-${code}`;
  if (!bankCodeCache.has(key)) {
    bankCodeCache.set(key, lookupBankName(code, currency));
  }
  return bankCodeCache.get(key)!;
}
```

---

## Security Monitoring

### 1. Monitor for Suspicious Activity

**Red Flags:**
- Multiple payouts to same account from different creators
- Unusually large payout amounts
- Payouts to recently added bank accounts
- Repeated failures followed by success (testing attacks)

**Query:**
```sql
-- Multiple creators paying same account
SELECT
  recipient_account_number,
  recipient_bank_code,
  COUNT(DISTINCT creator_id) as creator_count,
  SUM(amount) as total_amount,
  currency
FROM wise_payouts
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND status = 'completed'
GROUP BY recipient_account_number, recipient_bank_code, currency
HAVING COUNT(DISTINCT creator_id) > 3
ORDER BY creator_count DESC;
```

### 2. Audit Log Review

**Weekly Tasks:**
- Review all payouts >$1,000 USD
- Check for unusual patterns
- Verify creator bank details haven't changed suspiciously

### 3. Webhook Security

**Monitor:**
- Signature verification failures
- Unexpected webhook sources
- Replay attacks (duplicate events)

---

## Incident Response

### Severity Levels

#### P0 - Critical (Immediate Response)
- All payouts failing
- Database completely down
- Wise account suspended
- Security breach detected

**Response Time:** <15 minutes
**Escalation:** All hands on deck

#### P1 - High (Response within 1 hour)
- >20% failure rate
- Webhook stopped working
- Balance critically low
- Multiple stuck payouts

**Response Time:** <1 hour
**Escalation:** Dev team lead + Admin

#### P2 - Medium (Response within 4 hours)
- Individual payout failures
- Slow processing times
- Minor webhook issues

**Response Time:** <4 hours
**Escalation:** On-call developer

#### P3 - Low (Response within 24 hours)
- Documentation updates needed
- Non-critical errors
- Performance optimization opportunities

**Response Time:** <24 hours
**Escalation:** Backlog for sprint planning

### Incident Response Template

```markdown
## Incident Report

**Date/Time:** YYYY-MM-DD HH:MM UTC
**Severity:** P0/P1/P2/P3
**Status:** Investigating/Mitigated/Resolved
**Affected:** Number of users/payouts affected

### Summary
Brief description of the issue

### Timeline
- HH:MM - Issue detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Monitoring resumed
- HH:MM - Incident closed

### Root Cause
What caused the issue

### Impact
- X payouts affected
- Y users impacted
- $Z amount delayed

### Resolution
What was done to fix it

### Prevention
How to prevent this in the future

### Action Items
- [ ] Update documentation
- [ ] Add monitoring alert
- [ ] Improve error handling
```

---

## Monitoring Checklist

### Daily Tasks (10 minutes)
- [ ] Check Wise account balance
- [ ] Review failed payouts (if any)
- [ ] Check for stuck pending payouts (>1 hour old)
- [ ] Verify webhook is receiving events
- [ ] Review success rate for previous day

### Weekly Tasks (30 minutes)
- [ ] Review weekly payout summary
- [ ] Analyze error code trends
- [ ] Check for suspicious patterns
- [ ] Review Vercel function metrics
- [ ] Update monitoring thresholds if needed
- [ ] Check Wise fee costs

### Monthly Tasks (2 hours)
- [ ] Generate monthly payout report
- [ ] Review and optimize performance
- [ ] Update documentation
- [ ] Plan for scaling/improvements
- [ ] Security audit
- [ ] Review and update alert thresholds

---

## Quick Reference Commands

### Database Monitoring
```bash
# Connect to database
psql $DATABASE_URL

# Or use Supabase SQL Editor
# https://supabase.com/dashboard/project/YOUR_PROJECT/sql
```

### Wise API
```bash
# Check balance
node scripts/check-wise-balance.js

# List webhooks
node scripts/list-wise-webhooks.js

# Test webhook
node scripts/test-wise-webhook.js SUBSCRIPTION_ID
```

### Vercel
```bash
# View logs
vercel logs

# Pull environment variables
vercel env pull

# Check deployment status
vercel ls
```

### Testing
```bash
# Run end-to-end test
npx ts-node scripts/test-wise-payout-e2e.ts

# Verify webhook
node scripts/verify-wise-webhook.js
```

---

## Support Contacts

### Internal Team
- **Mobile Team Lead:** [Contact info]
- **Backend Team Lead:** [Contact info]
- **DevOps:** [Contact info]

### External
- **Wise Support:** https://wise.com/help/
- **Wise API Support:** api@wise.com
- **Supabase Support:** https://supabase.com/support

---

## Summary

This monitoring guide provides:

✅ Real-time monitoring queries
✅ Alert configuration
✅ Troubleshooting procedures
✅ Incident response protocols
✅ Performance optimization tips
✅ Security monitoring

**Remember:**
- Monitor daily for issues
- Respond quickly to alerts
- Document all incidents
- Continuously improve based on patterns
- Keep this guide updated

---

**Last Updated:** December 29, 2025
**Version:** 1.0
**Maintained By:** Mobile + Backend Teams
