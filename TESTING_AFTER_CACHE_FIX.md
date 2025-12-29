# Testing Guide: After Web Team's Cache Fix Deployment

**Date:** December 22, 2025  
**Status:** Ready for testing after deployment

---

## ✅ **What the Web Team Fixed**

They identified and fixed the **Vercel Edge Caching** issue:

1. ✅ Added `export const dynamic = 'force-dynamic'` - Forces fresh execution
2. ✅ Added `export const revalidate = 0` - Disables revalidation  
3. ✅ Added cache-control headers - Prevents all caching layers
4. ✅ Added enhanced logging - Easy to debug issues
5. ✅ Added user context verification - Detects RLS problems

---

## 🧪 **Testing Steps for Mobile Team**

### **Step 1: Wait for Deployment Confirmation**

Ask web team to confirm:
- ✅ Deployment completed successfully on Vercel
- ✅ No errors in deployment logs
- ✅ Changes are live in production

### **Step 2: Test in Expo Go**

1. **Reload the app:**
   - Press `R` in your terminal, OR
   - Shake device → Tap "Reload"

2. **Go to Feed tab**

3. **Pull down to refresh**

4. **Expected Result:**
   - ✅ Posts should appear immediately
   - ✅ No fallback warning in logs
   - ✅ Should see: `💾 Cached 10 posts (page 1)` (not 0)

### **Step 3: Check Console Logs**

**Expected logs:**
```
🌐 API Request: GET https://www.soundbridge.live/api/posts/feed?page=1&limit=10
📡 API Response: 200
💾 Cached 10 posts (page 1)  ← Should show actual count, not 0
```

**If you still see:**
```
💾 Cached 0 posts (page 1)  ← Still broken
```

Then the cache fix didn't work or wasn't deployed correctly.

### **Step 4: Test Multiple Times**

To ensure caching is disabled:
1. Pull to refresh **3-4 times**
2. Each time should fetch fresh data
3. Each time should show posts (not 0)
4. Verify no stale cached responses

### **Step 5: Test Different Users**

If possible, test with:
- Different user accounts
- Different devices
- TestFlight vs Expo Go (both should work now)

---

## 🔍 **If It Still Doesn't Work**

### **Check 1: Verify Deployment**

Ask web team to verify:
- Is the new code actually deployed?
- Check Vercel deployment ID
- Check function logs for enhanced logging output

### **Check 2: Clear Cache Manually**

If still showing 0 posts, web team should:

**Option A: Purge via Vercel Dashboard**
1. Go to Vercel Dashboard
2. Navigate to project
3. Settings → Edge Network
4. Click "Purge Everything"

**Option B: Purge via CLI**
```bash
vercel cache purge /api/posts/feed
```

### **Check 3: Test API Directly**

Web team should test with curl:
```bash
curl -X GET "https://www.soundbridge.live/api/posts/feed?page=1&limit=10" \
  -H "Authorization: Bearer VALID_TOKEN" \
  -H "Cache-Control: no-cache"
```

Expected: Should return posts array with data

### **Check 4: Check Vercel Logs**

Web team should check logs for:
- ✅ `User authenticated: [user-id]`
- ✅ `Supabase client user context verified: [user-id]`
- ✅ `📊 Query result: { postsCount: X, ... }`
- ✅ `📊 Found X posts`

If `postsCount: 0`, the issue is RLS policy, not caching.

---

## 📊 **Success Criteria**

✅ **Feed loads immediately**  
✅ **Posts appear in Expo Go**  
✅ **Posts appear in TestFlight**  
✅ **No fallback warnings in logs**  
✅ **API returns posts array with data**  
✅ **Console shows `Cached X posts` where X > 0**  
✅ **Multiple refreshes work consistently**  

---

## 🎯 **What Changed on Mobile**

We **removed the temporary Supabase fallback** that was working around the cache issue. Now the app will:

1. ✅ Call the API endpoint directly
2. ✅ Get fresh, uncached responses
3. ✅ Show posts from the API (not Supabase fallback)
4. ✅ Work consistently across all environments

---

## 📝 **Rollback Plan (If Needed)**

If the cache fix doesn't work and you need posts to show immediately, we can:

**Option 1: Re-enable Supabase Fallback (Temporary)**

Add this back to `src/services/api/feedService.ts` after line 52:
```typescript
// TEMPORARY: Fallback to Supabase if API returns 0 posts
if (rawPosts.length === 0 && page === 1) {
  console.warn('⚠️ API returned 0 posts - using Supabase fallback');
  return this.getFeedPostsFromSupabase(page, limit, session);
}
```

**Option 2: Use Supabase Exclusively (Last Resort)**

Change the fallback logic to always use Supabase in development:
```typescript
if (__DEV__) {
  return this.getFeedPostsFromSupabase(page, limit, session);
}
```

---

## 🚀 **Expected Timeline**

1. **Web team deploys:** ~5 minutes
2. **Vercel deploys automatically:** ~2-5 minutes  
3. **Cache clears naturally:** Immediate (due to cache-control headers)
4. **You test:** ~2 minutes
5. **Total:** ~10-15 minutes from push to verified

---

## 📞 **Communication Checklist**

**After web team deploys, confirm:**
- [ ] They pushed to main branch
- [ ] Vercel deployment succeeded
- [ ] No errors in Vercel logs
- [ ] They can see enhanced logging in function logs
- [ ] They tested the API endpoint directly

**Then you test:**
- [ ] Reload Expo Go app
- [ ] Pull to refresh feed
- [ ] Verify posts appear
- [ ] Check console logs
- [ ] Test multiple times

**If successful:**
- [ ] Thank the web team! 🎉
- [ ] Document the fix for future reference
- [ ] Move on with development

**If still broken:**
- [ ] Share console logs with web team
- [ ] Ask them to check Vercel function logs
- [ ] Consider re-enabling temporary fallback

---

## ✅ **Ready to Test!**

Once the web team confirms deployment:
1. Reload your Expo Go app
2. Go to Feed tab
3. Pull down to refresh
4. Posts should appear! 🎉

---

**Mobile App Team**  
December 22, 2025

