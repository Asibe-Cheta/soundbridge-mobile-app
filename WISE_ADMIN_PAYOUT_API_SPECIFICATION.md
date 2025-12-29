# Wise Admin Payout API Specification

**Purpose:** Backend API endpoints for admin-initiated creator payouts
**For:** Backend/Web Team Implementation
**Date:** 2025-12-29
**Status:** Ready for Implementation

---

## Overview

This document specifies the backend API endpoints needed for the admin dashboard to initiate Wise payouts to creators. The mobile app provides the payout logic (see `src/lib/wise/payout.ts` and `src/lib/wise/batch-payout.ts`), but the actual API endpoints must be implemented by the backend/web team.

## Required Endpoints

### 1. Initiate Single Payout

**Endpoint:** `POST /api/admin/payouts/initiate`

**Purpose:** Initiate a single payout to one creator

**Authentication:** Admin only (require admin role)

**Request Body:**
```typescript
{
  creatorId: string;           // UUID from profiles table
  amount: number;              // Amount in target currency (e.g., 50000)
  currency: 'NGN' | 'GHS' | 'KES' | 'USD' | 'EUR' | 'GBP';
  bankAccountNumber: string;   // Bank account number
  bankCode: string;            // Bank code (e.g., '044' for Access Bank)
  accountHolderName: string;   // Account holder name
  reason?: string;             // Optional reason for payout
  metadata?: Record<string, any>; // Optional metadata
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  payout: {
    id: string;                // Payout ID
    creator_id: string;
    amount: number;
    currency: string;
    status: 'processing';      // Will be 'processing' after successful creation
    wise_transfer_id: string;  // Wise transfer ID
    reference: string;
    created_at: string;
    // ... other fields from wise_payouts table
  }
}
```

**Response (Error - 400/500):**
```typescript
{
  success: false;
  error: string;               // Human-readable error message
  code: string;                // Error code (see Error Codes section)
  retryable: boolean;          // Whether client should retry
}
```

**Implementation:**
```typescript
// Next.js example: app/api/admin/payouts/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { payoutToCreator } from '@/lib/wise/payout';
import { verifyAdminAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // 1. Verify admin authentication
  const admin = await verifyAdminAuth(req);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    // 2. Parse request body
    const body = await req.json();
    const {
      creatorId,
      amount,
      currency,
      bankAccountNumber,
      bankCode,
      accountHolderName,
      reason,
      metadata
    } = body;

    // 3. Validate required fields
    if (!creatorId || !amount || !currency || !bankAccountNumber || !bankCode || !accountHolderName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          code: 'MISSING_PARAMS',
          retryable: false
        },
        { status: 400 }
      );
    }

    // 4. Call payout function
    const result = await payoutToCreator({
      creatorId,
      amount,
      currency,
      bankAccountNumber,
      bankCode,
      accountHolderName,
      reason,
      metadata: {
        ...metadata,
        initiated_by: admin.id,
        initiated_by_email: admin.email,
        initiated_at: new Date().toISOString(),
      }
    });

    // 5. Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        payout: result.payout
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code,
          retryable: result.retryable
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Admin payout API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        retryable: true
      },
      { status: 500 }
    );
  }
}
```

---

### 2. Initiate Batch Payouts

**Endpoint:** `POST /api/admin/payouts/batch`

**Purpose:** Initiate multiple payouts in one request

**Authentication:** Admin only (require admin role)

**Request Body:**
```typescript
{
  payouts: Array<{
    creatorId: string;
    amount: number;
    currency: 'NGN' | 'GHS' | 'KES' | 'USD' | 'EUR' | 'GBP';
    bankDetails: {
      accountNumber: string;
      bankCode: string;
      accountHolderName: string;
    };
    reason?: string;
    metadata?: Record<string, any>;
  }>;
  options?: {
    sequential?: boolean;      // Process sequentially (default: false)
    maxConcurrent?: number;    // Max concurrent (default: 5)
    stopOnError?: boolean;     // Stop on first error (default: false)
  };
}
```

**Response (Success - 200):**
```typescript
{
  success: boolean;            // True if ALL payouts succeeded
  total: number;               // Total payouts processed
  successful: Array<WisePayout>; // Successfully created payouts
  failed: Array<{
    creatorId: string;
    amount: number;
    currency: string;
    error: string;
    code: string;
    retryable: boolean;
  }>;
  summary: {
    successCount: number;
    failureCount: number;
    totalAmount: Record<string, number>;      // By currency
    successfulAmount: Record<string, number>; // By currency
    failedAmount: Record<string, number>;     // By currency
  };
}
```

**Implementation:**
```typescript
// Next.js example: app/api/admin/payouts/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { batchPayout } from '@/lib/wise/batch-payout';
import { verifyAdminAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // 1. Verify admin authentication
  const admin = await verifyAdminAuth(req);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    // 2. Parse request body
    const body = await req.json();
    const { payouts, options = {} } = body;

    // 3. Validate payouts array
    if (!Array.isArray(payouts) || payouts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payouts array is required and must not be empty',
          code: 'INVALID_PAYOUTS'
        },
        { status: 400 }
      );
    }

    // 4. Add admin metadata to all payouts
    const payoutsWithMetadata = payouts.map(p => ({
      ...p,
      metadata: {
        ...p.metadata,
        initiated_by: admin.id,
        initiated_by_email: admin.email,
        initiated_at: new Date().toISOString(),
      }
    }));

    // 5. Call batch payout function
    const result = await batchPayout(payoutsWithMetadata, options);

    // 6. Return result
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Batch payout API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
```

---

### 3. Get Payout Status

**Endpoint:** `GET /api/admin/payouts/:payoutId`

**Purpose:** Get current status of a payout

**Authentication:** Admin only

**Response (Success - 200):**
```typescript
{
  success: true;
  payout: {
    id: string;
    creator_id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
    wise_transfer_id: string | null;
    recipient_account_number: string;
    recipient_account_name: string;
    recipient_bank_name: string | null;
    error_message: string | null;
    wise_status_history: Array<{
      status: string;
      timestamp: string;
      from_status: string | null;
      error_message: string | null;
    }>;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    failed_at: string | null;
  }
}
```

**Implementation:**
```typescript
// Next.js example: app/api/admin/payouts/[payoutId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayoutById } from '@/lib/wise/database';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { payoutId: string } }
) {
  // 1. Verify admin authentication
  const admin = await verifyAdminAuth(req);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // 2. Get payout from database
    const result = await getPayoutById(params.payoutId);

    // 3. Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        payout: result.data
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code
        },
        { status: result.code === 'NOT_FOUND' ? 404 : 400 }
      );
    }
  } catch (error) {
    console.error('❌ Get payout API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
```

---

### 4. List Creator Payouts

**Endpoint:** `GET /api/admin/payouts/creator/:creatorId`

**Purpose:** List all payouts for a specific creator

**Authentication:** Admin only

**Query Parameters:**
- `status` (optional): Filter by status
- `currency` (optional): Filter by currency
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response (Success - 200):**
```typescript
{
  success: true;
  payouts: Array<WisePayout>;
  total: number;
  limit: number;
  offset: number;
}
```

**Implementation:**
```typescript
// Next.js example: app/api/admin/payouts/creator/[creatorId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCreatorPayouts } from '@/lib/wise/database';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  // 1. Verify admin authentication
  const admin = await verifyAdminAuth(req);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // 2. Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const currency = searchParams.get('currency') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 3. Get payouts from database
    const result = await getCreatorPayouts({
      creator_id: params.creatorId,
      status: status as any,
      currency: currency as any,
      limit,
      offset
    });

    // 4. Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        payouts: result.data,
        total: result.data?.length || 0,
        limit,
        offset
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ List payouts API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
```

---

### 5. Get Pending Payouts Summary

**Endpoint:** `GET /api/admin/payouts/summary/pending`

**Purpose:** Get summary of all pending payouts (for monitoring dashboard)

**Authentication:** Admin only

**Response (Success - 200):**
```typescript
{
  success: true;
  summary: Array<{
    currency: string;
    pending_count: number;
    total_amount: number;
    oldest_pending: string;    // ISO date
    newest_pending: string;    // ISO date
  }>;
}
```

**Implementation:**
```typescript
// Next.js example: app/api/admin/payouts/summary/pending/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPendingPayoutsSummary } from '@/lib/wise/database';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  // 1. Verify admin authentication
  const admin = await verifyAdminAuth(req);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // 2. Get summary from database view
    const result = await getPendingPayoutsSummary();

    // 3. Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        summary: result.data
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Pending summary API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
```

---

## Error Codes

The payout functions return specific error codes for different failure scenarios:

| Code | Description | Retryable | Action |
|------|-------------|-----------|--------|
| `MISSING_PARAMS` | Required parameters missing | No | Fix request |
| `INVALID_AMOUNT` | Amount <= 0 | No | Fix amount |
| `UNSUPPORTED_CURRENCY` | Currency not supported | No | Use supported currency |
| `CREATOR_NOT_FOUND` | Creator ID not found | No | Verify creator exists |
| `INVALID_BANK_ACCOUNT` | Bank account validation failed | No | Verify bank details |
| `DUPLICATE_REFERENCE` | Payout with reference exists | No | Use unique reference |
| `RECIPIENT_CREATION_FAILED` | Failed to create Wise recipient | Maybe | Check error message |
| `INSUFFICIENT_BALANCE` | Not enough Wise balance | No | Top up balance |
| `INVALID_ACCOUNT` | Account details invalid | No | Verify account details |
| `RATE_LIMIT_EXCEEDED` | Too many API requests | Yes | Wait and retry |
| `TIMEOUT` | Request timeout | Yes | Retry |
| `NETWORK_ERROR` | Network connection failed | Yes | Retry |
| `SERVER_ERROR` | Wise API server error | Yes | Retry |
| `UNAUTHORIZED` | Invalid Wise API credentials | No | Check credentials |
| `WISE_API_ERROR` | General Wise API error | Maybe | Check error message |
| `UNKNOWN_ERROR` | Unknown error occurred | Maybe | Check logs |

---

## Authentication

All admin endpoints MUST verify that the requesting user has admin privileges.

**Example Admin Auth Middleware:**
```typescript
// lib/auth.ts
import { NextRequest } from 'next/server';
import { verifyJWT } from './jwt';
import { supabase } from './supabase';

export async function verifyAdminAuth(req: NextRequest) {
  // 1. Get auth token from header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    // 2. Verify JWT token
    const payload = await verifyJWT(token);

    // 3. Check user exists and is admin
    const { data: user } = await supabase
      .from('profiles')
      .select('id, email, is_admin')
      .eq('id', payload.sub)
      .single();

    if (!user || !user.is_admin) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}
```

---

## Rate Limiting

Implement rate limiting on these endpoints to prevent abuse:

- Single payout: 100 requests/minute per admin
- Batch payout: 10 requests/minute per admin
- Get status: 200 requests/minute per admin

**Example Rate Limiter (using Redis):**
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number = 60
): Promise<boolean> {
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  return count <= limit;
}

// Usage in API route:
const allowed = await rateLimit(
  `admin_payout:${admin.id}`,
  100,  // 100 requests
  60    // per 60 seconds
);

if (!allowed) {
  return NextResponse.json(
    { success: false, error: 'Rate limit exceeded' },
    { status: 429 }
  );
}
```

---

## Logging and Monitoring

All payout operations should be logged for audit trail:

```typescript
// lib/auditLog.ts
export async function logPayoutAttempt(data: {
  admin_id: string;
  admin_email: string;
  creator_id: string;
  amount: number;
  currency: string;
  success: boolean;
  error?: string;
  payout_id?: string;
}) {
  await supabase.from('admin_audit_logs').insert({
    action: 'INITIATE_PAYOUT',
    admin_id: data.admin_id,
    admin_email: data.admin_email,
    resource_type: 'wise_payout',
    resource_id: data.payout_id,
    metadata: {
      creator_id: data.creator_id,
      amount: data.amount,
      currency: data.currency,
      success: data.success,
      error: data.error,
    },
    created_at: new Date().toISOString(),
  });
}
```

---

## Testing

### Manual Testing Checklist

- [ ] Test single payout with valid data
- [ ] Test single payout with invalid amount (should fail)
- [ ] Test single payout with non-existent creator (should fail)
- [ ] Test single payout with invalid bank details (should fail)
- [ ] Test batch payout with 3 valid payouts
- [ ] Test batch payout with mix of valid/invalid (some should succeed)
- [ ] Test batch payout with `stopOnError=true`
- [ ] Test payout status retrieval
- [ ] Test creator payout listing with filters
- [ ] Test pending payouts summary
- [ ] Test auth - non-admin user should be rejected
- [ ] Test rate limiting

### Example Test Requests

**1. Single Payout:**
```bash
curl -X POST https://your-api.com/api/admin/payouts/initiate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "creatorId": "uuid-here",
    "amount": 50000,
    "currency": "NGN",
    "bankAccountNumber": "0123456789",
    "bankCode": "044",
    "accountHolderName": "John Doe",
    "reason": "Monthly earnings payout"
  }'
```

**2. Batch Payout:**
```bash
curl -X POST https://your-api.com/api/admin/payouts/batch \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payouts": [
      {
        "creatorId": "uuid-1",
        "amount": 50000,
        "currency": "NGN",
        "bankDetails": {
          "accountNumber": "0123456789",
          "bankCode": "044",
          "accountHolderName": "John Doe"
        },
        "reason": "Monthly earnings"
      },
      {
        "creatorId": "uuid-2",
        "amount": 75000,
        "currency": "NGN",
        "bankDetails": {
          "accountNumber": "9876543210",
          "bankCode": "058",
          "accountHolderName": "Jane Smith"
        },
        "reason": "Monthly earnings"
      }
    ],
    "options": {
      "maxConcurrent": 5
    }
  }'
```

---

## Security Checklist

- [ ] Admin authentication required on all endpoints
- [ ] Rate limiting implemented
- [ ] Input validation on all parameters
- [ ] SQL injection prevention (using parameterized queries)
- [ ] XSS prevention (sanitize inputs)
- [ ] CORS configured properly
- [ ] Audit logging for all payout operations
- [ ] Sensitive data (bank details) logged with masking
- [ ] API keys stored in environment variables (never in code)
- [ ] HTTPS required (no HTTP)

---

## Next Steps

1. **Implement endpoints** in your backend/web app using the examples above
2. **Test thoroughly** using the test checklist
3. **Set up monitoring** for failed payouts
4. **Configure alerts** for critical errors (e.g., insufficient balance)
5. **Create admin dashboard UI** to consume these endpoints

---

**Questions?** Contact the mobile team for clarification on payout logic.

**Mobile App Files Referenced:**
- `src/lib/wise/payout.ts` - Main payout function
- `src/lib/wise/batch-payout.ts` - Batch payout function
- `src/lib/wise/database.ts` - Database helper functions
- `src/lib/types/wise.ts` - TypeScript type definitions
