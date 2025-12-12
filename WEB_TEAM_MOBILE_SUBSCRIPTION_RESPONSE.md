# Web Team Response: Mobile Subscription Feature Questions

**Date:** December 3, 2025  
**Status:** ✅ Complete Answers  
**For:** Mobile App Development Team

---

## 📋 Overview

This document provides comprehensive answers to all questions from the mobile team regarding subscription feature implementation, database schema, API endpoints, and feature enforcement strategies.

---

## 1. ✅ Message Limit Tracking

### **How It Works:**

**Database Table:** `usage_tracking`
- Tracks monthly outbound message counts per user
- Column: `usage_type = 'message'`
- Stores: `user_id`, `count`, `period_start_date`, `period_end_date`
- **Only outbound messages count** (incoming messages are unlimited)
- Resets automatically on user's **signup anniversary** (not calendar month)

**Example:** User signs up Jan 15 → Limits reset on 15th of each month

### **API Endpoint:**
✅ **EXISTS:** `GET /api/user/usage-limits`

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": {
      "used": 2,
      "limit": 3,
      "remaining": 1,
      "period_start": "2025-12-01T00:00:00Z",
      "period_end": "2026-01-01T00:00:00Z",
      "reset_date": "2026-01-01T00:00:00Z",
      "is_unlimited": false
    }
  }
}
```

**Alternative:** Also available in `GET /api/subscription/status`:
```json
{
  "data": {
    "limits": {
      "messages": {
        "used": 2,
        "limit": 3,
        "remaining": 1,
        "is_unlimited": false
      }
    }
  }
}
```

### **Database Function:**
- `check_message_limit(p_user_id UUID)` - Returns JSONB with quota info
- `increment_usage(p_user_id, 'message', 1)` - Increments counter when message sent

### **Mobile App Needs:**
✅ **ENDPOINT EXISTS** - Use `/api/user/usage-limits` or `/api/subscription/status`

**Limits:**
- Free: 3 outbound messages/month
- Pro: Unlimited (`is_unlimited: true`)

---

## 2. ✅ Search Limit Tracking

### **How It Works:**

**Database Table:** `usage_tracking`
- Tracks "professional searches" per user per month
- Column: `usage_type = 'search'`
- **What qualifies as "professional search":**
  - Searching for service providers (creators offering services)
  - Advanced search filters (location, genre, rate, availability)
  - Regular content search (music/podcasts) does NOT count
- Resets automatically on user's **signup anniversary**

### **API Endpoint:**
✅ **EXISTS:** `GET /api/user/usage-limits`

**Response:**
```json
{
  "success": true,
  "data": {
    "searches": {
      "used": 3,
      "limit": 5,
      "remaining": 2,
      "period_start": "2025-12-01T00:00:00Z",
      "period_end": "2026-01-01T00:00:00Z",
      "reset_date": "2026-01-01T00:00:00Z",
      "is_unlimited": false
    }
  }
}
```

**Alternative:** Also available in `GET /api/subscription/status`

### **Database Function:**
- `check_search_limit(p_user_id UUID)` - Returns JSONB with quota info
- `increment_usage(p_user_id, 'search', 1)` - Increments counter when professional search performed

### **Backend Enforcement:**
✅ The search endpoint (`/api/search`) automatically checks limits before processing professional searches and returns `429 Too Many Requests` if limit exceeded.

**Error Response:**
```json
{
  "success": false,
  "error": "Search limit reached",
  "limit": {
    "used": 5,
    "limit": 5,
    "remaining": 0,
    "reset_date": "2024-12-15T00:00:00Z",
    "upgrade_required": true,
    "message": "You have used all 5 of your monthly professional searches. Upgrade to Pro for unlimited searches."
  }
}
```

### **Mobile App Needs:**
✅ **ENDPOINT EXISTS** - Use `/api/user/usage-limits` or `/api/subscription/status`

**Limits:**
- Free: 5 professional searches/month
- Pro: Unlimited (`is_unlimited: true`)

**Note:** Backend enforces limits automatically. Mobile can check quota before showing search UI, but backend will reject if limit exceeded.

---

## 3. ✅ Storage Calculation

### **How It Works:**

**Storage is calculated dynamically from `audio_tracks` table:**
- Sums `file_size` or `size` column for all tracks where `creator_id = user_id`
- Excludes soft-deleted tracks (`deleted_at IS NULL`)
- **Cover images are NOT counted** (they're stored separately in Cloudinary/CDN)

**When a user deletes a track:**
- Track is soft-deleted (`deleted_at` set)
- Storage calculation automatically excludes it
- Storage usage decreases immediately

### **API Endpoint:**
✅ **EXISTS:** `GET /api/subscription/status`

**Response includes:**
```json
{
  "data": {
    "usage": {
      "total_storage_used": 52428800,  // bytes
      "formatted_storage": "50 MB"
    }
  }
}
```

### **Storage Limits:**
- **Free:** 150MB (157,286,400 bytes)
- **Pro:** 500MB (524,288,000 bytes)
- **Enterprise:** 2GB (2,147,483,648 bytes)

### **Validation Strategy:**

**✅ RECOMMENDED: Backend Enforcement**

The backend validates storage BEFORE upload:
- Function: `check_storage_limit(user_uuid UUID, file_size BIGINT)` returns `BOOLEAN`
- Upload endpoint checks storage quota before processing
- Returns error if upload would exceed quota

**Error Response:**
```json
{
  "error": "Storage limit exceeded",
  "details": "You have used 150MB of 150MB. Upgrade to Pro for 500MB storage.",
  "storage": {
    "used": 157286400,
    "limit": 157286400,
    "remaining": 0
  },
  "upgrade_required": true
}
```

### **Mobile App Recommendation:**
1. **Check storage before upload** (call `/api/subscription/status`)
2. **Backend will also validate** (double-check, can't be bypassed)
3. **Show storage usage in UI** (from `/api/subscription/status`)

---

## 4. ⚠️ Verified Badge Application

### **Current Status:**

**❌ NOT IMPLEMENTED for Regular Pro Users**

The verification system exists, but it's **only for Service Providers** (creators offering services like mixing, mastering, etc.), not regular Pro users.

### **Service Provider Verification (Different Feature):**

**Database Table:** `service_provider_verification_requests`
- For service providers only
- Requires prerequisites (completed bookings, portfolio, ratings)
- Admin-reviewed process

**Endpoints:**
- `GET /api/service-providers/{userId}/verification/status`
- `POST /api/service-providers/{userId}/verification/request`

### **For Regular Pro Users:**

**Current Status:**
- `is_verified` exists in `profiles` table
- **No application flow exists**
- **Admin-only** manual verification (no self-service)

### **Recommendation:**

**Option 1: Admin-Only (Current)**
- Keep verification admin-only
- Mobile app: Don't show "Request Verification" button
- Only display badge if `is_verified = true`

**Option 2: Implement Self-Service (Future)**
- Would require new endpoint: `POST /api/verification/request`
- New table: `user_verification_requests`
- Application form (portfolio, social links, reason)
- Admin review process

### **Mobile Team Action:**
- **For now:** Don't implement "Request Verification" button for Pro users
- **Display badge** when `profiles.is_verified = true`
- **Future:** We can implement self-service verification if needed

---

## 5. ⚠️ Analytics Data

### **Current Analytics Available:**

**✅ Basic Analytics Endpoint:**
`GET /api/profile/analytics`

**Returns:**
- Basic metrics: `total_plays`, `total_likes`, `total_followers`
- Track performance data

### **❌ Detailed Analytics NOT Fully Implemented**

**What's Missing:**
- Time-series data (plays/likes per day/week/month)
- Per-track breakdown
- Listener demographics
- Geographic data
- Revenue trends
- Advanced charts/data

### **Current Available Data:**

From `GET /api/subscription/status`:
```json
{
  "usage": {
    "music_uploads": 6,
    "podcast_uploads": 0,
    "event_uploads": 0,
    "total_storage_used": 52428800,
    "total_plays": 97,
    "total_followers": 0,
    "last_upload_at": "2025-12-01T10:30:00Z"
  }
}
```

From `GET /api/user/tip-analytics`:
- Tip analytics and revenue data

### **Pro Feature Access:**

**Advanced Analytics is listed as a Pro feature**, but detailed analytics endpoints need to be built.

### **Recommendation:**

**Phase 1 (Immediate):**
- Use existing basic analytics
- Show current stats (plays, likes, followers)
- Display as "Basic Analytics" for all users

**Phase 2 (Future):**
- Build detailed analytics endpoint: `GET /api/analytics/detailed`
- Implement time-series data
- Add charts and breakdowns

### **Mobile Team Action:**
- **For now:** Use `/api/subscription/status` for basic usage stats
- **Don't promise detailed analytics** until endpoint is built
- **Display basic stats** as "Analytics" (Pro users see same as Free for now)

---

## 6. ✅ Availability Calendar / Bookings

### **Status: ✅ FULLY IMPLEMENTED**

**This feature exists** but is for **Service Providers**, not all Pro users.

### **Database Tables:**

**`service_provider_availability` Table:**
- Stores availability slots
- Fields: `start_time`, `end_time`, `is_recurring`, `recurrence_rule`, `is_bookable`

**`service_bookings` Table:**
- Stores booking requests and confirmed bookings
- Fields: `provider_id`, `booker_id`, `offering_id`, `scheduled_start`, `scheduled_end`, `status`, `payment_status`

### **API Endpoints:**

✅ **EXISTS:** `GET /api/service-providers/{userId}/availability`
- Returns all availability slots for a service provider

✅ **EXISTS:** `POST /api/service-providers/{userId}/availability`
- Create new availability slot
- Body: `{ startTime, endTime, isRecurring, recurrenceRule, isBookable }`

✅ **EXISTS:** `DELETE /api/service-providers/{userId}/availability/{slotId}`
- Delete availability slot

✅ **EXISTS:** `GET /api/service-providers/{userId}/bookings`
- Get all bookings for a service provider

✅ **EXISTS:** `GET /api/bookings` (user's bookings)
- Get bookings for current user

### **Important Notes:**

1. **Only for Service Providers:**
   - User must enable "Service Provider" role
   - Available to all tiers (Free and Pro)
   - Pro features: Payment escrow, rate card display

2. **Not a General Pro Feature:**
   - Availability calendar is role-specific, not tier-specific
   - Any user can become a service provider

### **Mobile Team Action:**

- **If implementing for Service Providers:** All endpoints exist and are ready
- **If showing as "Pro feature":** This is misleading - it's a role feature, not tier feature
- **Clarify:** Availability calendar is for service providers, not all Pro users

---

## 7. ✅ Payment Protection & Escrow

### **Status: ✅ IMPLEMENTED**

**This feature exists** for **Service Provider bookings**.

### **How It Works:**

- When a client books a service provider, payment is processed through Stripe
- Funds are held in **Stripe escrow** until service is completed
- Provider receives payment after completing work
- Protects both client and provider

### **Database:**

- Payment status tracked in `service_bookings` table
- Status: `pending_payment`, `paid` (escrow), `completed`, `cancelled`
- Stripe payment intents and escrow handled via Stripe Connect

### **Mobile Team Notes:**

- **Service Provider feature**, not general Pro feature
- Works automatically when bookings are processed
- No separate endpoint needed - handled in booking flow

---

## 8. ✅ API Endpoint Status

### **Existing Endpoints:**

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/subscription/status` | ✅ EXISTS | Returns subscription, usage, limits, features |
| `GET /api/upload/quota` | ✅ EXISTS | Returns upload quota status |
| `GET /api/user/usage-limits` | ✅ EXISTS | Returns uploads, searches, messages limits |
| `POST /api/subscriptions/verify-iap` | ✅ EXISTS | Verifies Apple/Google IAP |
| `GET /api/user/usage-statistics` | ✅ EXISTS | Returns usage stats |
| `GET /api/subscription/message-quota` | ❌ **NOT NEEDED** | Use `/api/user/usage-limits` instead |
| `GET /api/subscription/search-quota` | ❌ **NOT NEEDED** | Use `/api/user/usage-limits` instead |
| `GET /api/subscription/storage` | ❌ **NOT NEEDED** | Included in `/api/subscription/status` |
| `POST /api/verification/request` | ❌ NOT EXISTS | Admin-only for now |
| `GET /api/analytics/detailed` | ❌ NOT EXISTS | Basic analytics only |

### **Recommended Endpoints for Mobile:**

**Use these endpoints:**
1. ✅ `GET /api/subscription/status` - **All-in-one endpoint** for subscription, usage, limits
2. ✅ `GET /api/user/usage-limits` - **Dedicated limits endpoint** (if you only need limits)

**Don't create separate endpoints for:**
- Message quota (already in `/api/user/usage-limits`)
- Search quota (already in `/api/user/usage-limits`)
- Storage (already in `/api/subscription/status`)

---

## 9. 🔒 Feature Enforcement Strategy

### **✅ RECOMMENDED: Backend Enforcement (Current Implementation)**

**Current Approach:**
- ✅ Backend validates all tier-restricted actions
- ✅ Returns `429 Too Many Requests` or `403 Forbidden` if limits exceeded
- ✅ Mobile app shows upgrade prompt on error
- ✅ **Secure, cannot be bypassed**

### **Backend Enforcement Points:**

1. **Upload Limits:**
   - `POST /api/upload` validates before processing
   - Checks `check_upload_limit()` function
   - Returns error if limit exceeded

2. **Search Limits:**
   - `GET /api/search` validates professional searches
   - Checks `check_search_limit()` function
   - Returns `429` if limit exceeded

3. **Message Limits:**
   - Message sending validates before sending
   - Checks `check_message_limit()` function
   - Returns error if limit exceeded

4. **Storage Limits:**
   - `POST /api/upload` validates storage before upload
   - Checks `check_storage_limit()` function
   - Returns error if quota exceeded

### **Mobile App Strategy:**

**Best Practice:**
1. ✅ **Check limits client-side** (for better UX - show warnings before action)
2. ✅ **Backend enforces anyway** (security - prevents bypass)
3. ✅ **Handle errors gracefully** (show upgrade prompt on 429/403)

**Example Flow:**
```typescript
// 1. Check limit before action (better UX)
const limits = await fetch('/api/user/usage-limits');
if (limits.messages.remaining === 0) {
  showUpgradePrompt();
  return;
}

// 2. Attempt action (backend will also validate)
try {
  await sendMessage();
} catch (error) {
  if (error.status === 429) {
    showUpgradePrompt();
  }
}
```

---

## 10. 📊 Summary & Recommendations

### **✅ Implemented & Ready:**

1. ✅ Message limit tracking (backend + endpoint)
2. ✅ Search limit tracking (backend + endpoint)
3. ✅ Storage calculation (backend + endpoint)
4. ✅ Upload quota checking (backend + endpoint)
5. ✅ Availability calendar (for service providers)
6. ✅ Payment escrow (for service provider bookings)

### **⚠️ Partially Implemented:**

1. ⚠️ Verified badge (admin-only, no self-service)
2. ⚠️ Detailed analytics (basic only, no time-series)

### **❌ Not Implemented:**

1. ❌ Self-service verification application for Pro users
2. ❌ Detailed analytics endpoint with time-series data

### **Mobile Team Implementation Priority:**

**High Priority (Ready Now):**
1. ✅ Implement message limit checks using `/api/user/usage-limits`
2. ✅ Implement search limit checks using `/api/user/usage-limits`
3. ✅ Display storage usage from `/api/subscription/status`
4. ✅ Restrict advanced filters to Pro users (client-side, immediate)
5. ✅ Enforce upload limits (backend already does, add client-side check)

**Medium Priority (Can Implement Now):**
6. ✅ Show usage indicators (limits remaining) from `/api/user/usage-limits`
7. ⚠️ Add verified badge display (if `is_verified = true`, but no request flow)

**Low Priority (Future):**
8. ⚠️ Verified badge application flow (wait for backend implementation)
9. ⚠️ Detailed analytics view (wait for backend endpoint)
10. ✅ Availability calendar (implement if supporting service providers)

---

## 11. 📝 Database Schema Summary

### **Usage Tracking Table:**

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  usage_type VARCHAR(20) CHECK (usage_type IN ('search', 'message')),
  count INTEGER DEFAULT 0,
  period_start_date TIMESTAMPTZ NOT NULL,
  period_end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, usage_type, period_start_date)
);
```

**Notes:**
- Tracks search and message usage separately
- Resets on user's signup anniversary (not calendar month)
- Auto-creates records when first usage occurs

### **Storage Calculation:**

- Calculated from `audio_tracks` table
- Sums `file_size` or `size` columns
- Excludes soft-deleted tracks
- Cover images NOT counted

---

## 12. 🎯 Quick Reference: Endpoints to Use

### **For Subscription & Limits:**

```typescript
// All-in-one endpoint (recommended)
GET /api/subscription/status
// Returns: subscription, usage, limits, features

// Or dedicated limits endpoint
GET /api/user/usage-limits
// Returns: uploads, searches, messages limits
```

### **For Upload Validation:**

```typescript
GET /api/upload/quota
// Returns: can_upload, uploads_used, uploads_limit, reset_date
```

### **For Service Provider Features:**

```typescript
GET /api/service-providers/{userId}/availability
POST /api/service-providers/{userId}/availability
GET /api/service-providers/{userId}/bookings
GET /api/bookings
```

---

## 13. ❓ Remaining Questions

### **Q: What qualifies as a "professional search"?**

**A:** 
- Searching for service providers (creators offering services)
- Using advanced search filters (location, genre, rate, availability)
- Regular content search (browsing music/podcasts) does NOT count
- Backend automatically determines this when processing search

### **Q: Should storage be validated before upload?**

**A:** 
- ✅ **Yes, for better UX** - Check storage before upload
- ✅ **Backend also validates** - Double-check, can't be bypassed
- ✅ **Show storage usage in UI** - From `/api/subscription/status`

### **Q: Is verified badge application self-service or admin-only?**

**A:** 
- ❌ **Admin-only for now** (for regular Pro users)
- ✅ **Self-service exists for Service Providers only**
- 🔄 **Can implement self-service for Pro users if needed** (would require new endpoints)

### **Q: What analytics data is available for Pro users?**

**A:** 
- ✅ **Basic analytics:** Total plays, likes, followers (available now)
- ❌ **Detailed analytics:** Time-series, breakdowns, charts (not yet implemented)
- ✅ **Usage statistics:** Uploads, storage, from `/api/subscription/status`

---

## ✅ Next Steps

**Mobile Team Should:**

1. ✅ Use `/api/user/usage-limits` or `/api/subscription/status` for all limit checks
2. ✅ Implement client-side limit checks (for UX)
3. ✅ Handle backend error responses (429/403) gracefully
4. ✅ Display usage indicators showing limits remaining
5. ⚠️ Don't implement verified badge request flow (wait for backend)
6. ⚠️ Use basic analytics only (detailed analytics not ready)

**Web Team Will:**

1. ✅ Keep existing endpoints functional
2. 🔄 Consider implementing self-service verification for Pro users (future)
3. 🔄 Consider building detailed analytics endpoint (future)

---

**Last Updated:** December 3, 2025  
**Status:** ✅ Ready for Mobile Team Implementation
