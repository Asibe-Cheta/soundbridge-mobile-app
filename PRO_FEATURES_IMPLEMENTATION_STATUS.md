# SoundBridge Pro Features - Implementation Status

## Pro Features List (from UpgradeScreen)

Based on the UpgradeScreen.tsx, here are the advertised Pro features:

### 1. **10 uploads per month (resets on 1st)**
- Free tier: 3 lifetime uploads
- Pro tier: 10 uploads per month

### 2. **Unlimited searches & messages**
- Free tier: 5 professional searches/month, 3 direct messages/month
- Pro tier: Unlimited

### 3. **500MB storage**
- Free tier: 150MB storage
- Pro tier: 500MB storage

### 4. **Advanced filters**
- Free tier: Basic search
- Pro tier: Advanced filtering capabilities

### 5. **Verified badge eligibility**
- Free tier: Not available
- Pro tier: Can apply for verified badge

### 6. **Payment protection & escrow**
- Free tier: Community support only
- Pro tier: Payment protection for transactions

### 7. **Detailed analytics**
- Free tier: Basic stats
- Pro tier: Detailed analytics dashboard

### 8. **Availability calendar**
- Free tier: Not available
- Pro tier: Can set availability for bookings

### 9. **Priority support**
- Free tier: Community support
- Pro tier: Priority customer support

---

## Implementation Status Checklist

### ✅ Subscription Detection
- [x] RevenueCat integration complete
- [x] Pro entitlement check in UpgradeScreen
- [x] Subscription status in user profile

### 🔍 Features Requiring Database Schema Verification

Need to verify with web team if these columns/tables exist in the database:

#### User Profile Table (`profiles`)
- [ ] `subscription_tier` column (free/pro)
- [ ] `upload_count` column (tracks monthly uploads)
- [ ] `upload_reset_date` column (last reset date)
- [ ] `storage_used` column (in bytes/MB)
- [ ] `storage_limit` column (150MB/500MB)
- [ ] `is_verified` column (verified badge status)
- [ ] `verified_at` column (when verified)

#### Search Tracking Table (`searches` or `user_searches`)
- [ ] User ID
- [ ] Search timestamp
- [ ] Search type (to count "professional searches")

#### Messages Tracking Table (`messages` or `direct_messages`)
- [ ] User ID
- [ ] Message timestamp
- [ ] Message type (to count against free tier limit)

#### Upload Tracking Table
- [ ] Upload count per user per month
- [ ] Reset mechanism on 1st of month

#### Analytics Tables
- [ ] Detailed analytics data storage
- [ ] Play counts, likes, tips per track
- [ ] Time-series data for graphs

#### Availability Calendar Table
- [ ] User availability schedules
- [ ] Booking slots

---

## Implementation Requirements by Feature

### 1. Upload Limits (10/month for Pro, 3 lifetime for Free)

**Current Status:** ❓ NEEDS VERIFICATION

**Files to Check:**
- Upload service/screen
- Database schema for upload tracking
- Backend API endpoint for upload validation

**Required Checks:**
```typescript
// Before allowing upload
const canUpload = async (userId: string, isPro: boolean) => {
  if (isPro) {
    // Check monthly upload count (resets on 1st)
    const uploadCount = await getMonthlyUploadCount(userId);
    return uploadCount < 10;
  } else {
    // Check lifetime upload count
    const uploadCount = await getLifetimeUploadCount(userId);
    return uploadCount < 3;
  }
};
```

### 2. Message Limits (Unlimited for Pro, 3/month for Free)

**Current Status:** ❓ NEEDS VERIFICATION

**Files to Check:**
- Direct messaging screen/service
- Database schema for message tracking

**Required Checks:**
```typescript
// Before sending message
const canSendMessage = async (userId: string, isPro: boolean) => {
  if (isPro) {
    return true; // Unlimited
  } else {
    const messageCount = await getMonthlyMessageCount(userId);
    return messageCount < 3;
  }
};
```

### 3. Search Limits (Unlimited for Pro, 5/month for Free)

**Current Status:** ❓ NEEDS VERIFICATION

**Files to Check:**
- Search/Discover screen
- Database schema for search tracking

**Required Checks:**
```typescript
// Before allowing professional search
const canSearch = async (userId: string, isPro: boolean) => {
  if (isPro) {
    return true; // Unlimited
  } else {
    const searchCount = await getMonthlySearchCount(userId);
    return searchCount < 5;
  }
};
```

### 4. Storage Limits (500MB for Pro, 150MB for Free)

**Current Status:** ❓ NEEDS VERIFICATION

**Files to Check:**
- Upload service
- Storage tracking in database

**Required Checks:**
```typescript
// Before allowing upload
const hasStorageSpace = async (userId: string, fileSize: number, isPro: boolean) => {
  const storageLimit = isPro ? 500 * 1024 * 1024 : 150 * 1024 * 1024; // bytes
  const storageUsed = await getStorageUsed(userId);
  return (storageUsed + fileSize) <= storageLimit;
};
```

### 5. Advanced Filters (Pro only)

**Current Status:** ❓ NEEDS VERIFICATION

**Files to Check:**
- DiscoverScreen filter options
- Search filters UI

**Required Implementation:**
```typescript
// Hide/show advanced filters based on tier
{isPro && (
  <>
    <FilterOption label="Price Range" />
    <FilterOption label="Location Radius" />
    <FilterOption label="Availability" />
  </>
)}
```

### 6. Verified Badge (Pro only)

**Current Status:** ❓ NEEDS VERIFICATION

**Files to Check:**
- Profile screen
- Verification flow
- Database schema for `is_verified`

**Required Implementation:**
- Pro users can apply for verification
- Display verified badge on profile
- Verification application UI

### 7. Payment Protection & Escrow (Pro only)

**Current Status:** ❓ NEEDS VERIFICATION

**Files to Check:**
- Payment/transaction screens
- Escrow service implementation

**Required Implementation:**
- Escrow flow for Pro users
- Direct payment for Free users

### 8. Detailed Analytics (Pro only)

**Current Status:** ❓ NEEDS VERIFICATION

**Files to Check:**
- ProfileScreen analytics section
- Analytics data collection

**Required Implementation:**
```typescript
// Show basic or detailed analytics
{isPro ? (
  <DetailedAnalytics /> // Graphs, time-series, detailed metrics
) : (
  <BasicStats /> // Just total counts
)}
```

### 9. Availability Calendar (Pro only)

**Current Status:** ❓ NEEDS VERIFICATION

**Files to Check:**
- Calendar component
- Booking system
- Database schema for availability

**Required Implementation:**
- Calendar UI for Pro users
- Availability slots management
- Booking integration

### 10. Priority Support (Pro only)

**Current Status:** ❓ NEEDS VERIFICATION

**Implementation:**
- Support ticket system
- Priority queue for Pro users
- In-app support chat

---

## Next Steps

1. **Verify Database Schema** - Need to confirm with web team:
   - Does `profiles` table have `subscription_tier`, `upload_count`, `storage_used`, etc.?
   - Are there separate tracking tables for uploads, messages, searches?
   - What columns exist for analytics, verified badge, availability?

2. **Check Existing Code** - Search codebase for:
   - Upload validation logic
   - Message sending logic
   - Search tracking
   - Storage calculation
   - Filter implementations

3. **Implement Missing Checks** - Add tier checks where needed:
   - Before allowing uploads
   - Before sending messages
   - Before professional searches
   - When showing advanced filters
   - When displaying analytics

4. **Add UI Indicators** - Show limits to users:
   - "2/3 uploads remaining (Free)"
   - "Upgrade to Pro for unlimited"
   - Lock icons on Pro-only features

---

## Questions for Web Team

**Database Schema Questions:**

1. Does the `profiles` table have these columns?
   - `subscription_tier` (VARCHAR: 'free' or 'pro')
   - `upload_count` (INTEGER: monthly upload count)
   - `upload_reset_date` (TIMESTAMP: last reset date)
   - `storage_used` (BIGINT: bytes used)
   - `storage_limit` (BIGINT: storage quota)
   - `is_verified` (BOOLEAN: verified badge status)

2. Do you have tracking tables for:
   - Upload counts (monthly resets)
   - Message counts (monthly limits)
   - Search counts (monthly limits)

3. How is storage calculated?
   - Do you sum file sizes from `audio_tracks` table?
   - Is there a separate `storage_usage` table?

4. Analytics data:
   - Is there a `track_analytics` table?
   - What metrics are tracked per track?

5. Availability calendar:
   - Is there an `availability_slots` table?
   - How are bookings managed?

**Backend API Questions:**

1. Are there API endpoints for:
   - `/api/subscription/check-upload-limit`
   - `/api/subscription/check-message-limit`
   - `/api/subscription/check-search-limit`
   - `/api/subscription/storage-usage`

2. Does the backend enforce these limits or is it client-side only?

3. Is there an endpoint to get the user's current quota/usage?
   - `/api/subscription/quota` → returns upload count, message count, etc.

