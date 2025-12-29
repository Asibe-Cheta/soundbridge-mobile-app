# Question for Claude: Wise Webhook Validation Failing

## Problem Summary

We're trying to set up a Wise (formerly TransferWise) webhook for transfer status updates, but Wise keeps rejecting our webhook URL with the error: **"The URL you entered isn't working. Please try a different one"**

## What We've Already Tried

### ✅ Endpoint Implementation

We've created a Next.js API route that responds correctly:

**File:** `app/wise-webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// Handle Wise webhook validation (GET request)
export async function GET(req: NextRequest) {
  console.log('Wise webhook validation GET request received');

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

    const rawBody = await req.text();
    const signature = req.headers.get('x-signature-sha256');

    if (!signature) {
      console.error('Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    console.log('Wise webhook event:', {
      eventType: body.event_type,
      resourceId: body.data?.resource?.id,
      currentState: body.data?.current_state,
    });

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Wise webhook error:', error);
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

### ✅ Verified Endpoint is Working

We've tested the endpoint and confirmed it's responding correctly:

```bash
$ curl -I https://www.soundbridge.live/wise-webhook

HTTP/2 200
content-type: text/plain
server: Vercel
strict-transport-security: max-age=63072000
```

```bash
$ curl https://www.soundbridge.live/wise-webhook

OK
```

```bash
$ curl -X POST https://www.soundbridge.live/wise-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

{"received":true}
```

### ✅ Tried Multiple URL Formats

We've tried these URLs in Wise webhook creation form:

1. ❌ `https://soundbridge.live/api/webhooks/wise` - Failed (redirects to www)
2. ❌ `https://www.soundbridge.live/api/webhooks/wise` - Failed
3. ❌ `https://www.soundbridge.live/wise-webhook` - Failed (current attempt)

All return proper HTTP 200 responses when tested manually.

### ✅ Fixed Redirect Issue

We confirmed that `soundbridge.live` redirects to `www.soundbridge.live`, so we're using `www.soundbridge.live` for the webhook URL.

### ✅ Verified SSL Certificate

The site has valid SSL/TLS certificate from Vercel.

### ✅ Hosting Platform

- **Platform:** Vercel (Next.js)
- **Domain:** soundbridge.live (with www subdomain)
- **SSL:** Valid HTTPS certificate
- **CORS:** Configured for webhook endpoint

## Current Setup

- **Wise Account:** Production/Live account (not sandbox)
- **Webhook Name:** SoundBridge Transfer Updates
- **Webhook URL:** https://www.soundbridge.live/wise-webhook
- **Event Type:** Transfer update events (selected)
- **Error:** "The URL you entered isn't working. Please try a different one"

## Questions for Research

Please browse the internet and research:

1. **What are Wise's exact requirements for webhook URL validation?**
   - Do they have specific documentation on webhook setup?
   - Are there any known issues with Wise webhook validation?
   - What HTTP response format do they expect during validation?

2. **What validation checks does Wise perform when creating a webhook?**
   - Do they require specific HTTP headers?
   - Do they send a validation challenge that needs a specific response?
   - Do they check for specific SSL/TLS versions or cipher suites?
   - Do they require the endpoint to be publicly accessible from specific IPs?

3. **Are there any known issues with Wise webhooks and Vercel/Next.js?**
   - Any compatibility issues?
   - Any specific configuration needed for Vercel deployments?

4. **What are common reasons Wise webhook validation fails?**
   - Rate limiting?
   - Firewall/WAF blocking Wise's validation requests?
   - Specific response format requirements?
   - Timing issues (endpoint must respond within X milliseconds)?

5. **Are there any differences between Wise sandbox and live/production webhook setup?**
   - Different validation requirements?
   - Different endpoints or configuration?

6. **What do successful Wise webhook implementations look like?**
   - Can you find any example implementations (GitHub, blog posts, documentation)?
   - What URL patterns do they use?
   - Any special configuration needed?

7. **Could this be a Wise API issue?**
   - Are there any current outages or known issues with Wise webhook validation?
   - Should we contact Wise support?

8. **Are there alternative approaches?**
   - Can we skip validation and add the webhook later?
   - Can we use a different method to receive transfer status updates?

## Additional Context

- We've successfully implemented the entire Wise payout system (transfer creation, recipient management, etc.)
- The webhook is the last piece needed for automatic status updates
- Without the webhook, we can still create payouts but won't get automatic status updates
- We're on a deadline and need this working soon

## What We Need

Please provide:
1. **Specific reasons** why Wise might be rejecting our webhook URL
2. **Step-by-step instructions** to fix the issue based on Wise's actual requirements
3. **Links to relevant documentation** or examples
4. **Alternative solutions** if webhook validation continues to fail
5. **Code fixes** if our endpoint implementation is missing something

## Test Results Summary

| Test | Result | Details |
|------|--------|---------|
| Endpoint responds to GET | ✅ Pass | Returns "OK" with 200 status |
| Endpoint responds to POST | ✅ Pass | Returns JSON with 200 status |
| SSL Certificate Valid | ✅ Pass | Valid HTTPS from Vercel |
| No Redirects | ✅ Pass | Using www subdomain directly |
| CORS Headers | ✅ Pass | Proper headers configured |
| Wise Validation | ❌ Fail | "The URL you entered isn't working" |

---

**Please research this thoroughly and provide a definitive solution. We've exhausted our troubleshooting options and need expert guidance on Wise webhook requirements.**
