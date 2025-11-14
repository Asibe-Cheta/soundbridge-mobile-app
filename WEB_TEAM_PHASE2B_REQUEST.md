# Web Team Action Needed – Phase 2B Mobile UX Integration

**Date:** November 8, 2025  
**From:** Mobile App Team  
**To:** Web App / Backend Team  
**Priority:** 🔴 Blocking Phase 2B

---

## Why We’re Reaching Out

The Supabase migration you ran (distance preferences, upload quota fields, `check_upload_quota`, `get_creator_earnings_summary`) gives us the database primitives we need. Thank you!  

To finish Phase 2A/2B and ship the new UX, we now need the corresponding API/RPC surfaces exposed so that the mobile app can consume the new data in production builds. Without these endpoints we are still relying on local fallbacks/mocks.

---

## Requests by Feature

### 1. Upload Limit Indicator (`UploadScreen`, `UploadLimitCard`)
- **Database function available:** `check_upload_quota(uuid)`  
- **What we need exposed:**
  - REST endpoint or Supabase RPC route we can call from the mobile client.
  - Expected URL (e.g. `GET /api/upload/quota` or `POST /rpc/check_upload_quota`).
  - Authentication requirements (session JWT? service key?).
  - Response payload contract, including field names and units.

### 2. Creator Earnings Dashboard (`CreatorProfileScreen`, upcoming dashboard card)
- **Database function available:** `get_creator_earnings_summary(uuid, start_date, end_date)`
- **What we need exposed:**
  - REST/RPC entry point (route + HTTP method or Supabase function name).
  - Required parameters (explicit date range vs. defaults).
  - Response schema (tips amount currency, stream counts, followers, engagement metrics).
  - Any rate limits or caching expectations.

### 3. Monthly Tips Count (`CreatorProfileScreen` Directive 9)
- **Database assumption:** Tips data lives in `tip_analytics` or equivalent.
- **What we need:**
  - Existing/Planned endpoint to query “tips received this month” for a creator.
  - Route, method, authentication, parameters (does period default to current month?).
  - Response contract (at minimum `{ count: number, amount: number }`).

### 4. Collaboration Requests (`CollaborationRequestForm`)
- **Database objects:** collaboration tables already in place.
- **What we need confirmed:**
  - Route + method to submit a request (e.g. `POST /api/collaboration/requests`).
  - Payload schema (field names, valid enum values for `project_type`, date format, optional fields).
  - Success + error response formats, including validation errors we should surface to users.

### 5. Tipping Checkout (`TipModal`)
- **Current state:** Modal uses mocked payment success.
- **What we need to go live:**
  - Endpoint flow for real Stripe payment: route, method, expected payload, and whether client creates PaymentIntent or backend handles it end-to-end.
  - Required headers/auth.
  - Success response payload (tip ID? receipt URL?).
  - Error codes/messages we should handle (card declined, insufficient funds, etc.).

### 6. Event Personalization Data (Phase 2A polish)
- **Database addition:** `profiles.preferred_event_distance` (👍)
- **Still need clarity on:**
  - Field names for stored genre preferences and city (confirm `preferred_genres`, `city`, etc.).
  - Event genre/tag field name + structure returned by `/api/events` (array of slugs? IDs?).
  - If additional lookup tables are required for decoding IDs.

---

## Requested Deliverables

1. **Endpoint documentation** covering each item above (route, method, auth, request/response schema).  
2. **Timeline** for when each endpoint will be available in production Supabase/Edge Functions.  
3. **Sample responses** (cURL or Postman examples) so we can validate integration quickly.  
4. Confirmation if any temporary feature flags or environment variables are required on mobile to consume the new endpoints.

---

## Why This Is Critical

Phase 2A (data displays) and Phase 2B (interactive tipping/collaboration flows, earnings dashboard) are blocked until the mobile app can fetch real data. Our current TestFlight build still shows fallbacks, so shipping to users is on hold.

Please let us know if anything here is unclear—we’re ready to jump on a call or Slack thread to get this unblocked.

Thank you!  
**– Mobile App Team**
