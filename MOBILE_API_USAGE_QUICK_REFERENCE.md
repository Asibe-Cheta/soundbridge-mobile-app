# 📱 Mobile App - Web API Usage Quick Reference

**Last Updated:** December 17, 2025  
**Purpose:** Quick lookup for which web API endpoints the mobile app uses

---

## 🎯 Quick Answer

**Does mobile app use web API routes for data fetching?**

**NO** - Mobile app uses **direct Supabase client queries** for all data operations.

**When does mobile app call web API?**

Only for **server-side operations**: payments, subscriptions, file uploads, and third-party integrations.

---

## ❌ Endpoints Mobile App Does NOT Use

| Endpoint Pattern | Purpose | Mobile Implementation |
|-----------------|---------|----------------------|
| `GET /api/playlists/[id]` | View playlist | Direct Supabase: `supabase.from('playlists')` |
| `GET /api/events/[id]` | View event | Direct Supabase: `supabase.from('events')` |
| `GET /creator/[username]` | View creator | Direct Supabase: `supabase.from('profiles')` |
| `GET /track/[id]` | View track | Direct Supabase: `supabase.from('audio_tracks')` |
| `GET /api/profile/analytics` | Profile stats | Client-side calculation from track data |
| `GET /api/feed` | Feed posts | Direct Supabase: `supabase.from('posts')` |
| `GET /api/search/*` | Search | Direct Supabase with filters |

**Why?** Direct Supabase queries are 80-90% faster than API routes.

---

## ✅ Endpoints Mobile App DOES Use

### Critical (High Priority)

| Endpoint | Purpose | File | Method |
|----------|---------|------|--------|
| `/api/user/follow/[userId]` | Follow/unfollow | `CreatorProfileScreen.tsx` | POST/DELETE |
| `/api/subscription/status` | Check subscription | `SubscriptionService.ts` | GET |
| `/api/payouts/request` | Request payout | `PayoutService.ts` | POST |
| `/api/payouts/eligibility` | Check eligibility | `PayoutService.ts` | GET |
| `/api/revenue/balance` | Get balance | `PayoutService.ts` | GET |
| `/api/events` | Create event | `CreateEventScreen.tsx` | POST |
| `/api/playlists` | Create playlist | `CreatePlaylistScreen.tsx` | POST |
| `/api/posts/upload-image` | Upload post image | `feedService.ts` | POST |
| `/api/posts/upload-audio` | Upload post audio | `feedService.ts` | POST |
| `/api/stripe/connect/create-account` | Stripe setup | `revenueService.ts` | POST |

### Important (Medium Priority)

| Endpoint | Purpose | File | Method |
|----------|---------|------|--------|
| `/api/user/notification-preferences` | Notification settings | `NotificationService.ts` | GET/POST |
| `/api/user/push-token` | Register push notifications | `NotificationService.ts` | POST |
| `/api/genres` | Get genre list | `OnboardingScreen.tsx` | GET |
| `/api/onboarding/check-username` | Check username | `OnboardingScreen.tsx` | POST |
| `/api/user/complete-onboarding` | Complete onboarding | `OnboardingScreen.tsx` | POST |

### Optional (Low Priority)

| Endpoint | Purpose | File | Method |
|----------|---------|------|--------|
| `/api/creator/earnings-summary` | Earnings dashboard | `EarningsService.ts` | GET |
| `/api/user/follow/[userId]/notifications` | Follow notifications | `CreatorProfileScreen.tsx` | POST |

---

## 🏗️ Architecture Pattern

### Data Fetching (GET Operations)

**Mobile App:**
```typescript
// ✅ GOOD: Direct Supabase query
const { data } = await supabase
  .from('playlists')
  .select('*')
  .eq('id', playlistId);
```

**NOT this:**
```typescript
// ❌ BAD: API route call
const response = await fetch('/api/playlists/' + playlistId);
```

### Server-Side Operations (POST/PUT/DELETE)

**Mobile App:**
```typescript
// ✅ GOOD: Use web API for server-side operations
const response = await fetch('/api/stripe/connect/create-account', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId })
});
```

---

## 🔍 How to Check If Endpoint Change Affects Mobile

### Step 1: Identify the endpoint type

**GET endpoint for viewing data?**
→ Mobile probably doesn't use it (we use direct Supabase)

**POST/PUT/DELETE for server operations?**
→ Mobile might use it (check the table above)

### Step 2: Search mobile codebase

```bash
# Search for the endpoint
grep -r "/api/your-endpoint" src/

# If found in these files, it's critical:
# - services/*.ts (payment, subscription services)
# - screens/*Screen.tsx (user-facing features)
# - contexts/*.tsx (global state management)
```

### Step 3: Quick validation

**If endpoint is in the "Critical" table above:**
- ⚠️ Notify mobile team BEFORE deploying changes
- 📝 Provide migration guide
- 🧪 Test with mobile team

**If endpoint is NOT in any table above:**
- ✅ Safe to change/remove
- ℹ️ Optional: Notify mobile team (FYI only)

---

## 📊 Why This Architecture?

### Performance Comparison

| Approach | Time | Success Rate |
|----------|------|--------------|
| Web API Route | 2-10s | 60% (40% timeout) |
| Direct Supabase | 0.3-1.5s | 99% |
| **Improvement** | **80-90% faster** | **39% fewer errors** |

### Benefits

1. **Faster:** No API route overhead
2. **Simpler:** Direct database queries
3. **Reliable:** No timeout issues
4. **Real-time:** Can use Supabase subscriptions
5. **Consistent:** Same pattern throughout mobile app

### When We Use API Routes

Only when we need:
- ✅ Server secret keys (Stripe, payment providers)
- ✅ PCI-compliant payment processing
- ✅ File upload signed URLs
- ✅ Third-party API calls (Twilio, SendGrid)
- ✅ Rate limiting and abuse prevention
- ✅ Complex server-side business logic

---

## 🎯 Quick Decision Tree

```
Is the change to a GET endpoint for viewing data?
├─ YES → Mobile probably NOT affected (uses direct Supabase)
└─ NO → Is it a payment/subscription/upload endpoint?
    ├─ YES → Check the "Critical" table above
    │        If found → Notify mobile team BEFORE deploying
    │        If not found → Safe to deploy
    └─ NO → Is it in the "Important" table?
        ├─ YES → Notify mobile team (coordinate testing)
        └─ NO → Safe to deploy (notify as FYI)
```

---

## 📞 Contact

**For API changes affecting mobile:**
1. Check this quick reference first
2. Search mobile codebase: `grep -r "your-endpoint" src/`
3. If unsure, ask mobile team (better safe than sorry!)

**For understanding mobile architecture:**
- `RESPONSE_TO_WEB_API_ENDPOINT_CHANGES.md` - Full architecture explanation
- `MOBILE_TEAM_RESPONSE_TO_WEB_TIMEOUT_ANALYSIS.md` - Why we use direct Supabase
- `src/lib/supabase.ts` - All database helper functions

---

## 📝 Recent Changes

### December 17, 2025 - Web API Route Cleanup

**Web changes:**
- ❌ Removed `/api/playlists/[id]`
- ❌ Removed `/api/events/[eventId]`
- ❌ Removed `/creator/[creatorId]`
- ❌ Removed `/track/[id]`

**Mobile impact:** ✅ NONE - Mobile doesn't use these endpoints

**Details:** See `RESPONSE_TO_WEB_API_ENDPOINT_CHANGES.md`

---

**Last verified:** December 17, 2025  
**Mobile app version:** Latest (post-albums feature)  
**Status:** ✅ All documented endpoints tested and working

