# Web App Team Response – Phase 2B Endpoints

[57 tools called]

## Endpoint Status

- **Upload quota (`UploadScreen`, `UploadLimitCard`)**  
  - Route: `GET /api/upload/quota` (supports `OPTIONS` CORS). Requires a valid Supabase session (cookie-based in production; mobile needs to pass their session cookie until we add bearer support).  
  - Response payload exposes tier, monthly limit, usage, and a `can_upload` boolean derived from the remaining count.  
  - Sample call: `curl -H "Cookie: sb-access-token=…" https://app.soundbridge.fm/api/upload/quota`  
  - Sample response:  
    ```json
    {
      "success": true,
      "quota": {
        "tier": "pro",
        "upload_limit": 10,
        "uploads_this_month": 3,
        "remaining": 7,
        "reset_date": "2025-12-01T00:00:00.000Z",
        "is_unlimited": false,
        "can_upload": true
      }
    }
    ```  
  - Evidence:  
    ```18:35:apps/web/app/api/upload/quota/route.ts
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }
  const { data: quotaData, error: quotaError } = await supabase.rpc('check_upload_quota', { p_user_id: user.id });
  // ... existing code ...
}
```  
  - Timeline: already merged; goes live with the next web deployment (same day once we promote).

- **Creator earnings summary (`CreatorProfileScreen`)**  
  - Route: `GET /api/creator/earnings-summary?month=YYYY-MM` (month optional; defaults to current). Auth: Supabase session cookie today; bearer support will be added alongside the collaboration fix (see below).  
  - Response bundles tips (amount/count/USD), stream count/top tracks, follower deltas, engagement counters, and the effective period.  
  - Sample call: `curl -H "Cookie: sb-access-token=…" "…/api/creator/earnings-summary?month=2025-11"`  
  - Sample response:  
    ```json
    {
      "success": true,
      "month": "2025-11",
      "period": {
        "start_date": "2025-11-01T00:00:00.000Z",
        "end_date": "2025-12-01T00:00:00.000Z"
      },
      "tips": { "amount": "245.50", "count": 18, "currency": "USD" },
      "streams": { "count": 1240, "top_tracks": [] },
      "followers": { "new_count": 42, "total_count": 1834 },
      "engagement": { "likes": 312, "comments": 58, "shares": 21 }
    }
    ```  
  - Evidence:  
    ```18:136:apps/web/app/api/creator/earnings-summary/route.ts
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  // ... existing code ...
  const { data: earningsData } = await supabase.rpc('get_creator_earnings_summary', {
    p_user_id: user.id,
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString()
  });
  // ... existing code ...
}
```  
  - Timeline: endpoint is live with current deployment pipeline.

- **Monthly tips count (Directive 9)**  
  - Route: `GET /api/user/tip-analytics?start_date=ISO&end_date=ISO`. Accepts bearer tokens (`Authorization: Bearer <Supabase JWT>`) in addition to cookies, so mobile can call it directly.  
  - Response: `analytics.total_tips`, `analytics.total_amount`, `analytics.total_earnings`, `analytics.tips_by_tier`, plus `recentTips` (latest 20 completed tips). Provide `start_date`=`2025-11-01T00:00:00Z` & `end_date`=`2025-12-01T00:00:00Z` to scope to the current month. Defaults to all-time if omitted.  
  - Sample call:  
    ```bash
    curl -H "Authorization: Bearer $SUPABASE_JWT" \
         "https://app.soundbridge.fm/api/user/tip-analytics?start_date=2025-11-01&end_date=2025-12-01"
    ```  
  - Evidence:  
    ```6:115:apps/web/app/api/user/tip-analytics/route.ts
const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || request.headers.get('x-authorization') || request.headers.get('x-auth-token') || request.headers.get('x-supabase-token');
// ... existing code ...
const { data: analytics } = await supabase.rpc('get_creator_tip_analytics', {
  creator_uuid: user.id,
  start_date: startDate ? new Date(startDate).toISOString() : null,
  end_date: endDate ? new Date(endDate).toISOString() : null
});
// ... existing code ...
```
  - Timeline: already available; no further work required unless you want a “defaults to current month” shortcut (we can add that in a follow-up sprint, ETA 0.5 day).

- **Collaboration requests (`CollaborationRequestForm`)**  
  - Current route: `POST /api/collaboration` to create requests; `GET /api/collaboration?type=sent|received` to list; `PUT /api/collaboration/{id}` to accept/decline.  
  - Payload requirements: `{ creator_id, availability_id, proposed_start_date, proposed_end_date, subject, message }`. Validation enforces slot availability and a per-slot request cap.  
  - Issue: these handlers only look at cookies via `createApiClientWithCookies()`, so the mobile app cannot authenticate with bearer tokens yet.  
  - Evidence:  
    ```61:175:apps/web/app/api/collaboration/route.ts
const supabase = await createApiClientWithCookies();
const { data: { user }, error: authError } = await supabase.auth.getUser();
// ... existing code ...
await supabase.from('collaboration_requests').insert({
  requester_id: user.id,
  creator_id: body.creator_id,
  availability_id: body.availability_id,
  // ... existing code ...
});
```
    ```6:10:apps/web/src/lib/supabase-api.ts
export const createApiClientWithCookies = async () => {
  const cookieStore = await cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
};
```
  - Plan: extend these routes to mirror the bearer-token logic used by tipping/tip analytics. Estimated effort: 1 engineering day (add shared auth helper + regression tests). Target deployment: end of next business day after approval.

- **Tipping checkout (`TipModal`)**  
  - Flow uses two endpoints, both bearer-compatible and Stripe-backed:  
    1. `POST /api/payments/create-tip` – creates a PaymentIntent, records provisional tip + fees, returns `clientSecret`, `paymentIntentId`, `tipId`, and calculated fees.  
    2. `POST /api/payments/confirm-tip` – verifies Stripe success, marks records completed, posts wallet + revenue transactions.  
  - Required headers: bearer JWT (`Authorization: Bearer <token>`) or cookies. Body params:  
    ```json
    {
      "creatorId": "uuid",
      "amount": 12.5,
      "currency": "USD",
      "message": "Keep it up!",
      "isAnonymous": false,
      "userTier": "free",
      "paymentMethod": "card"
    }
    ```  
  - Success response (create-tip): includes `clientSecret` to finish the client-side payment. Confirm-tip returns `{ "success": true, "message": "Tip sent successfully!" }`.  
  - Evidence:  
    ```19:165:apps/web/app/api/payments/create-tip/route.ts
if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}
// ... existing code ...
const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);
const { data: tipData } = await supabase.from('tip_analytics').insert({ /* … */ }).select().single();
// ... existing code ...
```
    ```19:168:apps/web/app/api/payments/confirm-tip/route.ts
if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}
// ... existing code ...
const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
// ... existing code ...
return NextResponse.json({ success: true, message: 'Tip sent successfully!' }, { headers: corsHeaders });
```  
  - Timeline: endpoints are production-ready; once Stripe keys are present in the environment, mobile can switch off mocks immediately.

- **Event personalization data**  
  - `profiles` now exposes `preferred_event_distance` and still includes `city`. Current preferences API (`GET/PATCH /api/users/{id}/preferences`) only surfaces `preferred_event_distance` (defaults to 25 miles) and enforces a 5–100 range.  
  - There is no persisted `preferred_genres` column yet, and `/api/events` returns event `category`, optional `tags[]`, and location fields, but no explicit genre slug list—data consumers should read `category` or `tags`.  
  - Evidence:  
    ```18:64:apps/web/app/api/users/[userId]/preferences/route.ts
const { data: profile } = await supabase
  .from('profiles')
  .select('preferred_event_distance')
  .eq('id', userId)
  .single();
// ... existing code ...
return NextResponse.json({
  success: true,
  preferences: {
    preferred_event_distance: profile.preferred_event_distance || 25
  }
});
```
    ```126:244:apps/web/app/api/events/route.ts
let query = supabase
  .from('events')
  .select(`
    *,
    creator:profiles!events_creator_id_fkey(
      id,
      username,
      display_name,
      avatar_url,
      banner_url
    ),
    attendees:event_attendees(
      user_id,
      status,
      created_at
    )
  `)
  .order('event_date', { ascending: true });
// ... existing code ...
return NextResponse.json({
  success: true,
  events: transformedEvents,
  total: transformedEvents.length
});
```
    ```19:43:apps/web/src/lib/types.ts
profiles: {
  Row: {
    id: string;
    city: string | null;
    country: string;
    // ... existing code ...
  }
}
```  
  - Plan:  
    1. Add `preferred_genres` (text[]) to `profiles` or a dedicated preferences table, plus API serialization (1.5 engineering days including migration).  
    2. Extend `/api/users/{id}/preferences` to return `{ preferred_genres, preferred_city }` and add PATCH validation (0.5 day).  
    3. Document event `category`/`tags` contract and, if needed, append a normalized `genres` array to `/api/events` output (0.5 day). Target delivery: mid next week, pending schema approval.

## Timeline Summary

- Already available once deployed: upload quota, earnings summary, tip analytics, Stripe tipping flow.  
- In progress / planned: bearer-token support for collaboration endpoints (ETA next business day), genre & city preference exposure + event payload update (target mid-week after migration).  
- No mobile feature flags or extra environment variables are required aside from the standard Supabase keys and Stripe configuration already in use.

Let me know if you’d like us to prioritize the collaboration auth update sooner, or if you need additional sample Postman collections.
