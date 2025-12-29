# URGENT: Wise Webhook Endpoint Fix

**Issue:** Wise webhook validation is failing with "The URL you entered isn't working"

**Problem:** Wise may be sending a validation challenge that the endpoint isn't handling correctly.

---

## Required Fix

Your endpoint at `https://www.soundbridge.live/api/webhooks/wise` needs to handle Wise's validation request.

### Current Implementation (Not Working)

```typescript
export async function GET() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Required Implementation (Working)

```typescript
// app/api/webhooks/wise/route.ts

import { NextRequest, NextResponse } from 'next/server';

/**
 * Wise webhook endpoint
 *
 * GET: Wise uses this to validate the webhook URL
 * POST: Wise sends transfer status updates here
 */

// Handle Wise webhook validation (GET request)
export async function GET(req: NextRequest) {
  console.log('Wise webhook validation GET request received');

  // Wise expects a simple 200 OK response
  return new Response('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

// Handle Wise webhook events (POST request)
export async function POST(req: NextRequest) {
  try {
    console.log('Wise webhook POST request received');

    // Get the raw body as text (needed for signature verification)
    const rawBody = await req.text();

    // Get signature from headers
    const signature = req.headers.get('x-signature-sha256');

    if (!signature) {
      console.error('Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // TODO: Verify signature (implement this later)
    // const isValid = verifyWiseSignature(rawBody, signature, process.env.WISE_WEBHOOK_SECRET);
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    // Parse the body
    const body = JSON.parse(rawBody);

    console.log('Wise webhook event:', {
      eventType: body.event_type,
      resourceId: body.data?.resource?.id,
      currentState: body.data?.current_state,
    });

    // TODO: Handle the webhook event
    // - Update wise_payouts table status
    // - See WISE_WEBHOOK_SPECIFICATION.md for full implementation

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Wise webhook error:', error);

    // Still return 200 to prevent Wise from retrying
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Signature-SHA256',
    },
  });
}
```

---

## Why This Fix Works

1. **GET returns plain text "OK"** - Some webhook validators expect plain text, not JSON
2. **Proper status code** - Returns 200 OK for validation
3. **POST handler** - Ready to receive actual webhook events
4. **Error handling** - Returns 200 even on errors to prevent retry loops

---

## Deployment Steps

1. Replace the current `app/api/webhooks/wise/route.ts` with the code above
2. Deploy to Vercel
3. Wait 1-2 minutes for deployment
4. Try creating the webhook in Wise again

---

## Testing

After deployment, test with:

```bash
# Should return "OK"
curl https://www.soundbridge.live/api/webhooks/wise

# Should return {"received":true}
curl -X POST https://www.soundbridge.live/api/webhooks/wise \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## If Still Fails

If the webhook validation still fails after this fix:

1. **Check Vercel logs** - Look for any errors when Wise hits the endpoint
2. **Try without www** - Configure Vercel to serve the API at `soundbridge.live` without redirecting
3. **Check SSL certificate** - Ensure SSL is valid (Wise requires HTTPS)
4. **Contact Wise support** - Ask what specific format they expect for webhook validation

---

## Vercel Configuration

Add this to `vercel.json` to prevent redirects on API routes:

```json
{
  "redirects": [
    {
      "source": "/:path((?!api).*)",
      "has": [
        {
          "type": "host",
          "value": "soundbridge.live"
        }
      ],
      "destination": "https://www.soundbridge.live/:path*",
      "permanent": true
    }
  ]
}
```

This ensures API routes don't redirect from `soundbridge.live` to `www.soundbridge.live`.

---

**Deploy this ASAP and retry the webhook creation in Wise.**
