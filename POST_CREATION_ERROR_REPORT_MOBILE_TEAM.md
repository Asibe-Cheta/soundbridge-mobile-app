# 🚨 POST CREATION ERROR REPORT - Mobile Team Coordination

**Date:** January 7, 2026  
**Reported by:** Web Team  
**Severity:** 🔴 **CRITICAL - App Crashes on Post Creation**  
**Status:** Investigating - Need Mobile Team Input

---

## 📊 Error Summary

### Primary Error: React Error #310 (Maximum Update Depth Exceeded)

**Error Message:**
```
Error: Minified React error #310; visit https://react.dev/errors/310 for the full message
```

**What This Means:**
- React Error #310 = "Maximum update depth exceeded"
- This indicates an **infinite loop** in React state updates or `useEffect` hooks
- The app crashes with "Something went wrong" error boundary

**When It Happens:**
- When attempting to create a post
- After post creation triggers feed refresh
- App becomes completely unusable (requires page reload)

---

### Secondary Error: 406 Not Acceptable (Bookmarks API)

**Error Message:**
```
Failed to load resource: the server responded with a status of 406 (Not Acceptable) (bookmarks, line 0)
```

**Frequency:** Multiple occurrences (9+ times in logs)

**What This Means:**
- The bookmarks API endpoint is rejecting requests
- 406 = "Not Acceptable" - usually means missing/invalid `Accept` header or content negotiation issue

**Impact:**
- Bookmark status checks fail
- Feed may not show correct bookmark states
- Less critical than the React error, but still needs fixing

---

## 🔍 Root Cause Analysis (Web App)

### Issue 1: Infinite Loop in Feed Page

**Location:** `apps/web/app/feed/page.tsx`

**Problem:**
```typescript
// Line 55-119: fetchPosts function
const fetchPosts = useCallback(async (pageNum: number, append: boolean = false, force: boolean = false) => {
  // ... fetch logic ...
  // Batch fetch bookmarks
  batchCheckBookmarks(postIds, 'post').then(...)
}, [user, batchCheckBookmarks]); // ⚠️ batchCheckBookmarks in dependencies

// Line 137-151: Infinite scroll useEffect
useEffect(() => {
  const handleScroll = () => {
    if (conditions) {
      fetchPosts(page + 1, true); // ⚠️ Calls fetchPosts
    }
  };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [hasMore, loadingMore, loading, page, fetchPosts]); // ⚠️ fetchPosts in dependencies
```

**Why This Causes Infinite Loop:**
1. `batchCheckBookmarks` is a `useCallback` that depends on `user`
2. If `user` object reference changes, `batchCheckBookmarks` gets recreated
3. This causes `fetchPosts` to be recreated (because it depends on `batchCheckBookmarks`)
4. This triggers the infinite scroll `useEffect` (because it depends on `fetchPosts`)
5. The scroll handler calls `fetchPosts`, which updates state, causing re-render
6. Re-render causes `fetchPosts` to be recreated again → **INFINITE LOOP**

---

### Issue 2: Bookmarks API 406 Error

**Location:** `apps/web/app/api/social/bookmark/route.ts`

**Problem:**
- API endpoint may not be setting proper `Accept` headers
- Client requests may be missing `Accept: application/json` header
- Content negotiation failing

**Current Implementation:**
```typescript
// GET endpoint doesn't explicitly set Accept header requirements
export async function GET(request: NextRequest) {
  // ... no explicit Accept header check
}
```

---

## 🎯 Questions for Mobile Team

### 1. Post Creation Flow

**Question:** Does the mobile app experience similar crashes when creating posts?

**Context:** The web app crashes with React Error #310 when:
- User clicks "Create Post" button
- User submits post form
- Feed tries to refresh after post creation

**What We Need:**
- [ ] Does mobile app crash when creating posts?
- [ ] What error messages (if any) appear on mobile?
- [ ] Does the feed refresh work correctly after post creation?
- [ ] Are there any infinite loop warnings in mobile logs?

---

### 2. Bookmarks API Usage

**Question:** How does the mobile app call the bookmarks API?

**Context:** Web app is getting 406 errors when checking bookmark status.

**What We Need:**
- [ ] What endpoint does mobile app use for bookmarks? (`/api/social/bookmark` or `/api/social/bookmarks`?)
- [ ] What HTTP method? (GET, POST?)
- [ ] What headers does mobile app send? (especially `Accept` header)
- [ ] Does mobile app experience 406 errors?
- [ ] How does mobile app batch-check bookmarks for multiple posts?

**Example Request We're Making:**
```typescript
// Web app batch check
batchCheckBookmarks(postIds, 'post')
// Calls: GET /api/social/bookmark?content_id=...&content_type=post
```

---

### 3. Feed Refresh After Post Creation

**Question:** How does mobile app handle feed refresh after creating a post?

**Context:** Web app refreshes feed by:
1. Resetting page to 1
2. Calling `fetchPosts(1, false, true)`
3. This triggers bookmark batch check
4. This may cause infinite loop

**What We Need:**
- [ ] How does mobile app refresh feed after post creation?
- [ ] Does mobile app batch-check bookmarks on feed load?
- [ ] Are there any performance issues or infinite loops?
- [ ] What's the mobile app's approach to preventing re-renders?

---

### 4. Error Handling

**Question:** How does mobile app handle React/JavaScript errors?

**Context:** Web app shows "Something went wrong" error boundary when React Error #310 occurs.

**What We Need:**
- [ ] Does mobile app have error boundaries?
- [ ] How are infinite loop errors handled?
- [ ] What user experience when errors occur?

---

## 🔧 Proposed Fixes (Web App)

### Fix 1: Stabilize `batchCheckBookmarks` Dependency

**Option A: Remove from `fetchPosts` dependencies**
```typescript
const fetchPosts = useCallback(async (pageNum: number, append: boolean = false, force: boolean = false) => {
  // ... fetch logic ...
  // Call batchCheckBookmarks but don't depend on it
  if (user?.id && postIds.length > 0) {
    batchCheckBookmarks(postIds, 'post').then(...);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user]); // Only depend on user, not batchCheckBookmarks
```

**Option B: Use ref to store function**
```typescript
const batchCheckBookmarksRef = useRef(batchCheckBookmarks);
useEffect(() => {
  batchCheckBookmarksRef.current = batchCheckBookmarks;
}, [batchCheckBookmarks]);

const fetchPosts = useCallback(async (...) => {
  // Use ref instead of direct call
  batchCheckBookmarksRef.current(postIds, 'post').then(...);
}, [user]); // Stable dependency
```

**Option C: Memoize bookmark check separately**
```typescript
// Only check bookmarks when posts actually change
useEffect(() => {
  if (posts.length > 0 && user?.id) {
    const postIds = posts.map(p => p.id);
    batchCheckBookmarks(postIds, 'post').then(...);
  }
}, [posts.map(p => p.id).join(','), user?.id]); // Only when post IDs change
```

---

### Fix 2: Fix Bookmarks API 406 Error

**Add explicit Accept header handling:**
```typescript
export async function GET(request: NextRequest) {
  // Check Accept header
  const acceptHeader = request.headers.get('accept');
  if (!acceptHeader || !acceptHeader.includes('application/json')) {
    return NextResponse.json(
      { error: 'Accept: application/json header required' },
      { status: 406, headers: corsHeaders }
    );
  }
  // ... rest of implementation
}
```

**Or make it more lenient:**
```typescript
// Always return JSON regardless of Accept header
return NextResponse.json({ ... }, { 
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json'
  }
});
```

---

## 🧪 Testing Checklist

### Web App Testing (After Fixes):

- [ ] Create a post → Verify no React Error #310
- [ ] Create post with image → Verify upload works
- [ ] Create post with audio → Verify upload works
- [ ] Check feed refreshes after post creation
- [ ] Verify bookmarks API returns 200 (not 406)
- [ ] Verify bookmark status shows correctly on posts
- [ ] Test infinite scroll → Verify no infinite loops
- [ ] Check browser console → Verify no error spam

---

### Mobile App Testing (Coordination):

- [ ] Test post creation → Verify no crashes
- [ ] Test bookmark functionality → Verify works
- [ ] Test feed refresh → Verify no performance issues
- [ ] Check logs for infinite loop warnings
- [ ] Verify API calls match web app approach

---

## 📋 Mobile Team Action Items

### Immediate:

1. **Test Post Creation**
   - Try creating a post on mobile app
   - Check for any crashes or errors
   - Report back with findings

2. **Check Bookmarks API**
   - Verify mobile app's bookmark API calls
   - Check if mobile app gets 406 errors
   - Share mobile app's API request format

3. **Review Feed Refresh Logic**
   - Document how mobile app refreshes feed after post creation
   - Check for any infinite loop patterns
   - Share best practices

### Follow-up:

4. **Coordinate Fixes**
   - If mobile app has similar issues, align on solution
   - If mobile app works fine, learn from their approach
   - Ensure consistency across platforms

5. **Update Documentation**
   - Document post creation flow
   - Document bookmark API usage
   - Document feed refresh patterns

---

## 🔗 Related Files

### Web App:
- `apps/web/app/feed/page.tsx` - Feed page with infinite loop
- `apps/web/src/hooks/useSocial.ts` - Social hooks including `batchCheckBookmarks`
- `apps/web/src/components/posts/CreatePostModal.tsx` - Post creation modal
- `apps/web/app/api/social/bookmark/route.ts` - Bookmarks API (406 error)
- `apps/web/app/api/posts/route.ts` - Post creation API

### Mobile App (Unknown Locations):
- Post creation screen/component
- Feed refresh logic
- Bookmarks API client
- Error handling/error boundaries

---

## ⏰ Urgency

**Priority:** 🔴 **CRITICAL**

**Reasoning:**
- App is completely unusable after attempting to create a post
- Users cannot create posts (core functionality broken)
- Infinite loop causes performance issues
- Needs immediate fix

**Timeline:**
- Web app fix: **IMMEDIATE** (within hours)
- Mobile team response: **ASAP** (within 24 hours)
- Coordinated solution: **Within 48 hours**

---

## 📞 Contact

**Web Team:** [Your contact]  
**Mobile Team:** [Mobile team contact]  
**Status:** Awaiting mobile team input before finalizing fixes

---

## ✅ Next Steps

1. **Web Team:** Implement proposed fixes (stabilize dependencies, fix 406 error)
2. **Mobile Team:** Test and report findings (see Questions section)
3. **Both Teams:** Coordinate on consistent solution
4. **Web Team:** Deploy fixes after mobile team confirmation
5. **Both Teams:** Update documentation

---

**Please respond with your findings so we can ensure consistency across platforms!**

