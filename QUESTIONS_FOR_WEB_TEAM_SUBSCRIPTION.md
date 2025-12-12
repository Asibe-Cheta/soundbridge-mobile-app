# Questions for Web Team - Subscription Feature Implementation

## Context
The mobile app needs to enforce Pro tier limits for various features. Based on my codebase analysis, some features are implemented while others need database/backend support.

---

## Database Schema Questions

### 1. Message Limit Tracking
**Question:** How do you track monthly outbound message counts per user?

- Is there a `message_count` column in the `profiles` table?
- Or a separate `user_message_tracking` table with monthly counts?
- How do you differentiate between "outbound" vs "inbound" messages for limit purposes?
- Does the limit reset automatically on the 1st of each month?

**Mobile App Needs:**
- API endpoint: `GET /api/subscription/message-quota` or similar
- Response should include: `{ used: 2, limit: 3, remaining: 1, is_unlimited: false }`

---

### 2. Search Limit Tracking
**Question:** How do you track "professional searches" per user per month?

- Is there a search tracking table (`user_searches` or similar)?
- What qualifies as a "professional search" vs a regular search?
- Is there an API endpoint to check search quota?
- Does it reset monthly?

**Mobile App Needs:**
- API endpoint: `GET /api/subscription/search-quota`
- Response: `{ used: 3, limit: 5, remaining: 2, is_unlimited: false }`
- OR: Should mobile app track searches client-side only?

---

### 3. Storage Calculation
**Question:** How is storage calculated for each user?

I found that `SubscriptionService.ts` calls `/api/subscription/status` which returns `storage_used` and `storage_limit`.

- Do you sum the file sizes from `audio_tracks` table where `creator_id = user_id`?
- Is there a `storage_usage` column in `profiles` table?
- When a user deletes a track, does `storage_used` automatically decrease?
- Are cover images counted toward storage quota?

**Clarification Needed:**
- Should the mobile app validate storage BEFORE uploading (to prevent failed uploads)?
- Or does the backend reject uploads that exceed quota?

---

### 4. Verified Badge Application
**Question:** How do Pro users apply for the verified badge?

I see `is_verified` exists in the `profiles` table and is displayed in the mobile app.

- Is there a verification application flow/form?
- Should mobile app have a "Request Verification" button for Pro users?
- Or is verification granted manually by admins only?
- Is there a `verification_requests` table for pending applications?

**Proposed Mobile Flow:**
```
Pro User → Profile Settings → "Request Verified Badge" button
  → Fill verification form → Submit to backend
  → Admin reviews → Approve/Deny
  → Mobile app shows verified badge when `is_verified = true`
```

Should we implement this, or is it admin-only?

---

### 5. Analytics Data
**Question:** What analytics data is available for Pro users?

Current mobile app shows basic stats:
- `total_plays`, `total_likes`, `total_tips_received`, `total_earnings`

For Pro users, we want to show "Detailed Analytics". What data is available?

- Time-series data (plays/likes per day/week/month)?
- Per-track breakdown?
- Listener demographics?
- Geographic data?
- Revenue trends?

**API Endpoint Needed:**
- `GET /api/analytics/detailed?user_id=X` (for Pro users)
- Returns time-series data, charts, breakdowns

Does this endpoint exist? If not, what data CAN we query for detailed analytics?

---

### 6. Availability Calendar / Bookings
**Question:** Is the availability calendar feature implemented on the backend?

The mobile app advertises "Availability calendar" as a Pro feature.

- Is there an `availability_slots` table?
- Is there a booking system?
- API endpoints for:
  - `GET /api/availability/:user_id` (get available slots)
  - `POST /api/availability` (set availability)
  - `GET /api/bookings` (get bookings)

**Status:** Does this feature exist yet, or is it planned for future implementation?

---

### 7. Payment Protection & Escrow
**Question:** Is the payment escrow system implemented?

The mobile app lists "Payment protection & escrow" as a Pro feature.

- Is there an escrow service/table?
- Do Pro users' transactions go through escrow automatically?
- Or is this a planned feature?

**Status:** Implemented or planned?

---

## API Endpoint Questions

### Current Mobile App Usage
The mobile app currently calls these subscription-related endpoints:

1. **`GET /api/subscription/status`** ✅ Working
   - Returns: `{ tier, status, features, limits }`
   - Used to check Pro access

2. **`GET /api/upload/quota`** ✅ Working
   - Returns: `{ can_upload, uploads_used, uploads_limit, reset_date }`
   - Used to enforce upload limits

3. **`POST /api/subscriptions/verify-iap`** ✅ Working (assumed)
   - Verifies Apple/Google in-app purchase
   - Called after RevenueCat purchase

### Missing/Needed Endpoints

4. **`GET /api/subscription/message-quota`** ❓
   - Returns: `{ used, limit, remaining, is_unlimited }`
   - Needed for message limit enforcement

5. **`GET /api/subscription/search-quota`** ❓
   - Returns: `{ used, limit, remaining, is_unlimited }`
   - Needed for search limit enforcement

6. **`GET /api/subscription/storage`** ❓ (or included in `/status`?)
   - Returns current storage usage vs limit
   - Needed to validate before upload

7. **`POST /api/verification/request`** ❓
   - For Pro users to apply for verified badge
   - Payload: `{ user_id, reason, portfolio_url, etc. }`

8. **`GET /api/analytics/detailed`** ❓
   - Returns detailed analytics for Pro users
   - Time-series data, breakdowns, charts

**Question:** Which of these endpoints exist? Which need to be created?

---

## Feature Enforcement Strategy

### Option 1: Backend Enforcement (Recommended)
- Backend validates all tier-restricted actions
- Returns 403/402 error if user exceeds limits
- Mobile app shows upgrade prompt on error
- **Pros:** Secure, can't be bypassed
- **Cons:** Requires backend changes

### Option 2: Client-Side Only
- Mobile app checks limits before actions
- Backend doesn't validate (trusts client)
- **Pros:** Faster to implement
- **Cons:** Can be bypassed by modified apps

**Question:** Which approach do you prefer? Should mobile app enforce limits, backend enforce limits, or both?

---

## Summary of Needed Information

Please provide:

1. ✅ or ❌ for each missing endpoint above
2. Database schema details for:
   - Message tracking
   - Search tracking
   - Storage calculation
   - Verification requests
   - Analytics data
   - Availability/bookings
   - Escrow system

3. Clarification on:
   - What qualifies as a "professional search"?
   - Should storage be validated before upload?
   - Is verified badge application self-service or admin-only?
   - What analytics data is available for Pro users?

4. Implementation timeline:
   - Which features are implemented vs planned?
   - Priority for missing endpoints?

---

## Next Steps (Mobile Team)

Once we receive answers:

**High Priority:**
1. Implement message limit checks (if endpoint exists)
2. Implement search limit checks (if endpoint exists)
3. Restrict advanced filters to Pro users (client-side, immediate)
4. Enforce storage limits in upload flow (if endpoint exists)

**Medium Priority:**
5. Add verified badge application flow (if self-service)
6. Implement detailed analytics view (if data available)
7. Add usage indicators showing limits remaining

**Low Priority:**
8. Availability calendar feature (if backend exists)
9. Payment escrow integration (if implemented)

Please let us know which endpoints exist and we'll implement the corresponding mobile app features immediately!

