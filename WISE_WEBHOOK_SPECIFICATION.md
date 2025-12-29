# Wise Webhook Endpoint Specification

**Date:** 2025-12-29
**For:** Backend/Web Team
**Purpose:** Receive and process Wise transfer status updates

---

## Overview

This document specifies the webhook endpoint that must be implemented on the backend to receive transfer status updates from Wise API.

**Endpoint:** `POST /api/webhooks/wise`
**Authentication:** HMAC-SHA256 signature verification

---

## Table of Contents

1. [Endpoint Details](#endpoint-details)
2. [Signature Verification](#signature-verification)
3. [Event Types](#event-types)
4. [Status Mapping](#status-mapping)
5. [Implementation Example](#implementation-example)
6. [Error Handling](#error-handling)
7. [Testing](#testing)

---

## Endpoint Details

### URL
```
POST https://yourdomain.com/api/webhooks/wise
```

### Headers (Received from Wise)
```
Content-Type: application/json
X-Signature-Sha256: <hmac_signature>
X-Delivery-Id: <unique_delivery_id>
```

### Request Body (Example)
```json
{
  "data": {
    "resource": {
      "id": 12345678,
      "profile_id": 87654321,
      "account_id": 11122233,
      "type": "REGULAR"
    },
    "current_state": "outgoing_payment_sent",
    "previous_state": "processing",
    "occurred_at": "2025-12-29T10:00:00Z"
  },
  "subscription_id": "abc-123-def-456",
  "event_type": "transfers#state-change",
  "schema_version": "2.0.0",
  "sent_at": "2025-12-29T10:00:01Z"
}
```

### Response
```
Status: 200 OK
Body: { "received": true }
```

**IMPORTANT:** Always return 200 OK to acknowledge receipt, even if processing fails internally.

---

## Signature Verification

### Why It's Critical
Signature verification ensures the webhook is genuinely from Wise and not a malicious actor.

### Verification Process

1. **Get the signature from header:**
   ```typescript
   const signature = req.headers['x-signature-sha256'];
   ```

2. **Get the raw request body as string:**
   ```typescript
   const rawBody = JSON.stringify(req.body);
   ```

3. **Compute HMAC-SHA256:**
   ```typescript
   import crypto from 'crypto';

   const expectedSignature = crypto
     .createHmac('sha256', process.env.WISE_WEBHOOK_SECRET)
     .update(rawBody)
     .digest('hex');
   ```

4. **Compare using timing-safe equality:**
   ```typescript
   const isValid = crypto.timingSafeEqual(
     Buffer.from(signature),
     Buffer.from(expectedSignature)
   );
   ```

5. **Reject if invalid:**
   ```typescript
   if (!isValid) {
     console.error('❌ Invalid Wise webhook signature');
     return res.status(401).json({ error: 'Invalid signature' });
   }
   ```

### Complete Verification Function

```typescript
import crypto from 'crypto';

function verifyWiseSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    // Constant-time comparison (security best practice)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}
```

---

## Event Types

### 1. transfers#state-change
**When:** Transfer status changes (most common)

**Payload:**
```json
{
  "event_type": "transfers#state-change",
  "data": {
    "resource": { "id": 12345678 },
    "current_state": "outgoing_payment_sent",
    "previous_state": "processing",
    "occurred_at": "2025-12-29T10:00:00Z"
  }
}
```

**Action:** Update payout status in `wise_payouts` table

---

### 2. transfers#active-cases
**When:** Transfer has issues/holds

**Payload:**
```json
{
  "event_type": "transfers#active-cases",
  "data": {
    "resource": { "id": 12345678 },
    "case_id": "case-123",
    "case_type": "ADDITIONAL_INFO_REQUIRED",
    "occurred_at": "2025-12-29T10:00:00Z"
  }
}
```

**Action:** Log the issue, optionally notify creator

---

## Status Mapping

Map Wise transfer statuses to our internal payout statuses:

| Wise Status | Description | Our Status | Action |
|-------------|-------------|------------|--------|
| `incoming_payment_waiting` | Waiting for funds | `processing` | Update status |
| `processing` | Being processed | `processing` | Update status |
| `funds_converted` | Currency converted | `processing` | Update status |
| `outgoing_payment_sent` | Sent to recipient | `completed` | Update status, set `completed_at` |
| `bounced_back` | Payment bounced | `failed` | Update status, set `failed_at`, log error |
| `funds_refunded` | Refunded | `failed` | Update status, set `failed_at` |
| `charged_back` | Charged back | `refunded` | Update status |
| `cancelled` | Cancelled | `cancelled` | Update status |

### Status Mapping Function

```typescript
function mapWiseStatusToPayoutStatus(wiseStatus: string): string {
  const statusMap: Record<string, string> = {
    'incoming_payment_waiting': 'processing',
    'processing': 'processing',
    'funds_converted': 'processing',
    'outgoing_payment_sent': 'completed',
    'bounced_back': 'failed',
    'funds_refunded': 'failed',
    'charged_back': 'refunded',
    'cancelled': 'cancelled',
  };

  return statusMap[wiseStatus] || 'processing';
}
```

---

## Implementation Example

### Next.js API Route (app/api/webhooks/wise/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role key (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify Wise webhook signature
function verifyWiseSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

// Map Wise status to our status
function mapWiseStatus(wiseStatus: string): string {
  const statusMap: Record<string, string> = {
    'incoming_payment_waiting': 'processing',
    'processing': 'processing',
    'funds_converted': 'processing',
    'outgoing_payment_sent': 'completed',
    'bounced_back': 'failed',
    'funds_refunded': 'failed',
    'charged_back': 'refunded',
    'cancelled': 'cancelled',
  };

  return statusMap[wiseStatus] || 'processing';
}

export async function POST(req: NextRequest) {
  try {
    console.log('📥 Wise webhook received');

    // Get signature from header
    const signature = req.headers.get('x-signature-sha256');
    const deliveryId = req.headers.get('x-delivery-id');

    if (!signature) {
      console.error('❌ Missing webhook signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Get raw body
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    console.log('📋 Webhook event:', {
      eventType: body.event_type,
      deliveryId,
      transferId: body.data?.resource?.id,
    });

    // Verify signature
    const webhookSecret = process.env.WISE_WEBHOOK_SECRET!;
    const isValid = verifyWiseSignature(rawBody, signature, webhookSecret);

    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('✅ Signature verified');

    // Handle different event types
    const eventType = body.event_type;

    if (eventType === 'transfers#state-change') {
      await handleTransferStateChange(body);
    } else if (eventType === 'transfers#active-cases') {
      await handleActiveCases(body);
    } else {
      console.warn('⚠️  Unknown event type:', eventType);
    }

    // Always return 200 OK
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);

    // Still return 200 to prevent Wise from retrying
    // (log error for debugging instead)
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}

// Handle transfer state change
async function handleTransferStateChange(payload: any) {
  try {
    const transferId = payload.data.resource.id.toString();
    const currentState = payload.data.current_state;
    const previousState = payload.data.previous_state;
    const occurredAt = payload.data.occurred_at;

    console.log('🔄 Transfer state change:', {
      transferId,
      previousState,
      currentState,
    });

    // Find payout in database by wise_transfer_id
    const { data: payout, error: findError } = await supabase
      .from('wise_payouts')
      .select('*')
      .eq('wise_transfer_id', transferId)
      .single();

    if (findError || !payout) {
      console.error('❌ Payout not found for transfer:', transferId);
      return;
    }

    console.log('📦 Found payout:', payout.id);

    // Map Wise status to our status
    const newStatus = mapWiseStatus(currentState);

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      wise_response: payload,
      updated_at: new Date().toISOString(),
    };

    // Set completed_at if completed
    if (newStatus === 'completed') {
      updateData.completed_at = occurredAt;
    }

    // Set failed_at if failed
    if (newStatus === 'failed') {
      updateData.failed_at = occurredAt;
      updateData.error_message = `Transfer ${currentState}`;
    }

    // Update payout in database
    const { error: updateError } = await supabase
      .from('wise_payouts')
      .update(updateData)
      .eq('id', payout.id);

    if (updateError) {
      console.error('❌ Failed to update payout:', updateError);
      return;
    }

    console.log('✅ Payout updated successfully:', {
      id: payout.id,
      status: newStatus,
    });
  } catch (error) {
    console.error('❌ Error handling state change:', error);
  }
}

// Handle active cases (issues/holds)
async function handleActiveCases(payload: any) {
  try {
    const transferId = payload.data.resource.id.toString();
    const caseId = payload.data.case_id;
    const caseType = payload.data.case_type;

    console.log('⚠️  Active case:', {
      transferId,
      caseId,
      caseType,
    });

    // Find payout and log the issue
    const { data: payout } = await supabase
      .from('wise_payouts')
      .select('*')
      .eq('wise_transfer_id', transferId)
      .single();

    if (!payout) {
      console.error('❌ Payout not found for transfer:', transferId);
      return;
    }

    // Update payout with case information
    const { error } = await supabase
      .from('wise_payouts')
      .update({
        error_message: `Active case: ${caseType}`,
        error_code: caseType,
        wise_response: payload,
      })
      .eq('id', payout.id);

    if (error) {
      console.error('❌ Failed to update payout:', error);
      return;
    }

    console.log('✅ Active case logged');

    // TODO: Optionally notify creator about the issue
  } catch (error) {
    console.error('❌ Error handling active case:', error);
  }
}
```

---

### Express.js Implementation (Alternative)

```typescript
import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

router.post('/api/webhooks/wise', async (req, res) => {
  try {
    console.log('📥 Wise webhook received');

    // Get signature
    const signature = req.headers['x-signature-sha256'] as string;

    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Get raw body (make sure body-parser is configured for raw JSON)
    const rawBody = JSON.stringify(req.body);

    // Verify signature
    const webhookSecret = process.env.WISE_WEBHOOK_SECRET!;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('❌ Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook (same logic as Next.js example)
    const eventType = req.body.event_type;

    if (eventType === 'transfers#state-change') {
      await handleTransferStateChange(req.body);
    } else if (eventType === 'transfers#active-cases') {
      await handleActiveCases(req.body);
    }

    // Return 200 OK
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.json({ received: true, error: 'Processing error' });
  }
});

export default router;
```

---

## Error Handling

### Best Practices

1. **Always return 200 OK**
   - Even if processing fails
   - Prevents Wise from retrying indefinitely
   - Log errors for debugging instead

2. **Log everything**
   ```typescript
   console.log('📥 Webhook received:', {
     eventType: body.event_type,
     transferId: body.data.resource.id,
     deliveryId: req.headers['x-delivery-id'],
   });
   ```

3. **Store webhook payload**
   ```typescript
   await supabase
     .from('wise_payouts')
     .update({
       wise_response: payload, // Store full webhook
     })
     .eq('wise_transfer_id', transferId);
   ```

4. **Handle missing payouts gracefully**
   ```typescript
   if (!payout) {
     console.error('Payout not found:', transferId);
     return; // Don't throw error
   }
   ```

5. **Use try-catch blocks**
   ```typescript
   try {
     await handleTransferStateChange(body);
   } catch (error) {
     console.error('Error processing webhook:', error);
     // Still return 200
   }
   ```

---

## Testing

### 1. Test Signature Verification

```typescript
// Test with known values
const testBody = '{"event_type":"transfers#state-change"}';
const testSecret = 'your_webhook_secret';
const testSignature = crypto
  .createHmac('sha256', testSecret)
  .update(testBody)
  .digest('hex');

console.log('Test signature:', testSignature);
```

### 2. Send Test Webhook

```bash
curl -X POST https://yourdomain.com/api/webhooks/wise \
  -H "Content-Type: application/json" \
  -H "X-Signature-Sha256: <computed_signature>" \
  -d '{
    "event_type": "transfers#state-change",
    "data": {
      "resource": { "id": 12345678 },
      "current_state": "completed",
      "previous_state": "processing",
      "occurred_at": "2025-12-29T10:00:00Z"
    }
  }'
```

### 3. Verify Database Update

```sql
SELECT
  id,
  status,
  wise_transfer_id,
  completed_at,
  wise_response->>'event_type' as event_type
FROM wise_payouts
WHERE wise_transfer_id = '12345678';
```

### 4. Check Logs

```bash
# Check application logs for webhook events
tail -f /var/log/app/webhooks.log | grep "Wise webhook"
```

---

## Security Checklist

- [ ] ✅ Webhook signature verification implemented
- [ ] ✅ Using constant-time comparison for signatures
- [ ] ✅ WISE_WEBHOOK_SECRET stored securely (env variable)
- [ ] ✅ Webhook endpoint uses HTTPS only
- [ ] ✅ Rate limiting configured (optional but recommended)
- [ ] ✅ Request logging enabled
- [ ] ✅ Error responses don't leak sensitive info

---

## Monitoring

### Metrics to Track

1. **Webhook receipts:**
   - Total webhooks received
   - Success vs error rate
   - Average processing time

2. **Signature failures:**
   - Count of invalid signatures
   - Alert if threshold exceeded

3. **Status updates:**
   - Completed payouts per day
   - Failed payouts per day
   - Pending payouts aging

### Example Monitoring Query

```sql
-- Daily webhook stats
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_payouts,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_seconds
FROM wise_payouts
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Wise Dashboard Configuration

### 1. Create Webhook Subscription

1. Go to [Wise API Settings](https://wise.com/settings/api-tokens)
2. Navigate to "Webhooks"
3. Click "Create webhook"
4. Configure:
   - **Name:** "SoundBridge Production Webhooks"
   - **URL:** `https://api.soundbridge.com/api/webhooks/wise`
   - **Environment:** LIVE
   - **Events:**
     - ✅ `transfers#state-change`
     - ✅ `transfers#active-cases`

5. Save and note the subscription ID

### 2. Test Webhook

Wise provides a "Send test webhook" button in the dashboard.

### 3. Monitor Deliveries

Wise dashboard shows webhook delivery history:
- Success/failure status
- Response codes
- Retry attempts

---

## Troubleshooting

### Issue: Signature verification always fails

**Cause:** Body encoding mismatch

**Solution:** Ensure you're using the **exact raw body** received:
```typescript
// Express: Use raw body parser
app.use('/api/webhooks/wise', express.raw({ type: 'application/json' }));

// Next.js: Access raw body
export const config = {
  api: {
    bodyParser: false,
  },
};
```

---

### Issue: Payout not found

**Cause:** Transfer ID mismatch

**Solution:** Ensure transfer ID is stored as string:
```typescript
const transferId = transfer.id.toString();
```

---

### Issue: Database update fails

**Cause:** RLS policies blocking service role

**Solution:** Use service role key, not anon key:
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Not ANON key
);
```

---

## Summary

**Implementation Checklist:**

1. ✅ Create webhook endpoint at `/api/webhooks/wise`
2. ✅ Implement signature verification
3. ✅ Handle `transfers#state-change` event
4. ✅ Handle `transfers#active-cases` event
5. ✅ Map Wise statuses to internal statuses
6. ✅ Update `wise_payouts` table
7. ✅ Store webhook payload in `wise_response` column
8. ✅ Always return 200 OK
9. ✅ Log all events
10. ✅ Configure webhook in Wise dashboard
11. ✅ Test with Wise test webhooks
12. ✅ Monitor webhook deliveries

---

**Status:** 📋 Ready for Backend Implementation

**Last Updated:** 2025-12-29

---

**END OF SPECIFICATION**
