# 🚨 CRITICAL: Content Moderation System Fixes

**Date:** December 23, 2024  
**Status:** ✅ **FIXES APPLIED**  
**Priority:** 🔴 CRITICAL

---

## 🔴 **ISSUES IDENTIFIED & FIXED**

### **Issue #1: Cron Job Not Running** ✅ FIXED

**Root Cause:**
- Cron job schedule was set to `"0 0 * * *"` (daily at midnight) instead of `"*/5 * * * *"` (every 5 minutes)
- Location: `apps/web/vercel.json`
- **Additional Issue:** Vercel Hobby plan only allows once-per-day cron jobs (not every 5 minutes)
- **Solution:** Upgraded to Vercel Pro plan ✅

**Fix Applied:**
```json
{
  "crons": [
    {
      "path": "/api/cron/moderate-content",
      "schedule": "*/5 * * * *"  // ✅ Every 5 minutes (Pro plan enabled)
    }
  ]
}
```

**✅ Current Status:**
- Schedule: **Every 5 minutes** (Pro plan allows unlimited frequency)
- Tracks will be processed within 5 minutes of upload
- Professional-grade moderation system ✅

**Additional Improvements:**
- Added automatic creation of default admin settings if missing
- Better error handling for missing settings
- Enhanced logging for debugging

---

### **Issue #2: Admin Panel Can't See Pending Tracks** ✅ FIXED

**Root Causes:**
1. **Using anon key instead of service_role** - RLS was blocking admin access
2. **Query parameter mismatch** - Frontend sent `filter` but API expected `status`
3. **Missing status handling** - `pending_check` status wasn't included in query

**Fixes Applied:**

#### **1. Admin API Now Uses Service Role Key**
```typescript
// ✅ Now uses service_role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

**Location:** `apps/web/app/api/admin/moderation/queue/route.ts`

#### **2. Fixed Query Parameter Handling**
```typescript
// ✅ Now supports both 'filter' (frontend) and 'status' (API)
const filter = url.searchParams.get('filter') || url.searchParams.get('status') || 'flagged';
```

#### **3. Fixed Status Filtering**
```typescript
// ✅ Now properly handles pending_check status
if (filter === 'pending') {
  query = query.in('moderation_status', ['pending_check', 'checking']);
}
```

#### **4. Fixed Frontend Query**
```typescript
// ✅ Frontend now properly maps filter to status parameter
const statusParam = filter === 'pending' ? 'pending' : filter === 'flagged' ? 'flagged' : 'all';
const response = await fetch(`/api/admin/moderation/queue?filter=${statusParam}`);
```

---

## 📋 **FILES MODIFIED**

1. ✅ `apps/web/vercel.json`
   - Fixed cron schedule from daily to every 5 minutes

2. ✅ `apps/web/app/api/cron/moderate-content/route.ts`
   - Added automatic creation of default admin settings
   - Better error handling

3. ✅ `apps/web/app/api/admin/moderation/queue/route.ts`
   - Changed to use `service_role` key (bypasses RLS)
   - Fixed query parameter handling (`filter` vs `status`)
   - Added proper `pending_check` status filtering
   - Added `deleted_at` filter

4. ✅ `apps/web/app/admin/moderation/page.tsx`
   - Fixed query parameter mapping
   - Added better error handling
   - Improved loading states

---

## 🚀 **DEPLOYMENT STEPS**

### **1. Commit and Push Changes**
```bash
git add apps/web/vercel.json
git add apps/web/app/api/cron/moderate-content/route.ts
git add apps/web/app/api/admin/moderation/queue/route.ts
git add apps/web/app/admin/moderation/page.tsx

git commit -m "fix: Content moderation cron job and admin panel access

- Fix cron schedule to run every 5 minutes (was daily)
- Admin panel now uses service_role key to bypass RLS
- Fix pending_check status filtering in admin panel
- Add automatic default settings creation for cron job"

git push origin main
```

### **2. Verify Vercel Deployment**
1. Go to Vercel Dashboard
2. Check that deployment completed successfully
3. Verify cron job is configured:
   - Go to Settings → Cron Jobs
   - Should see `/api/cron/moderate-content` with schedule `*/5 * * * *` (every 5 minutes)
   - **Note:** Pro plan allows unlimited cron frequency ✅

### **3. Verify Environment Variables**
Ensure these are set in Vercel:
- ✅ `CRON_SECRET` - Secret for cron job authentication
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin access
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- ✅ `OPENAI_API_KEY` - For content moderation
- ✅ `MODERATION_BATCH_SIZE` - Optional (defaults to 10)

### **4. Verify Admin Settings**
Run this SQL in Supabase to ensure settings exist:
```sql
-- Check if admin_settings exists and has auto_moderation_enabled
SELECT id, auto_moderation_enabled, moderation_strictness, whisper_model
FROM admin_settings
WHERE id = 1;

-- If missing, insert default:
INSERT INTO admin_settings (
  id,
  auto_moderation_enabled,
  moderation_strictness,
  whisper_model,
  transcription_enabled
)
VALUES (
  1,
  true,  -- ✅ Enable auto-moderation
  'medium',
  'base',
  true
)
ON CONFLICT (id) DO UPDATE SET
  auto_moderation_enabled = true;  -- ✅ Ensure it's enabled
```

---

## 🧪 **TESTING CHECKLIST**

### **Test 1: Cron Job Runs**
- [ ] Wait 5 minutes after deployment
- [ ] Check Vercel function logs for `/api/cron/moderate-content`
- [ ] Should see: `🔄 Content moderation cron job started`
- [ ] Should see: `✅ Content moderation job completed`
- [ ] Check database - tracks should change from `pending_check` to `clean` or `flagged`
- [ ] **Note:** With Pro plan, cron runs every 5 minutes automatically ✅

### **Test 2: Admin Panel Shows Pending Tracks**
- [ ] Log in as admin user
- [ ] Go to `/admin/moderation`
- [ ] Click "Pending" tab
- [ ] Should see all 8 stuck tracks (not empty)
- [ ] Should show "Pending (8)" in the tab

### **Test 3: Admin Panel Shows Flagged Tracks**
- [ ] After cron job processes tracks, some should be flagged
- [ ] Click "Flagged" tab
- [ ] Should see flagged tracks with flag reasons
- [ ] Should be able to approve/reject tracks

### **Test 4: Manual Cron Trigger (Optional)**
```bash
# Test cron endpoint manually
curl -X GET "https://www.soundbridge.live/api/cron/moderate-content" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Expected response:
{
  "success": true,
  "message": "Content moderation job completed",
  "result": {
    "processed": 8,
    "flagged": X,
    "errors": 0
  }
}
```

---

## 📊 **EXPECTED RESULTS**

### **After Deployment:**

1. **Cron Job:**
   - ✅ Runs **every 5 minutes** automatically (Pro plan enabled)
   - ✅ Processes all 8 stuck tracks within first run
   - ✅ Updates tracks from `pending_check` → `checking` → `clean`/`flagged`
   - ✅ Sets `moderation_checked_at` timestamp
   - ✅ Professional-grade moderation system

2. **Admin Panel:**
   - ✅ Shows "Pending (8)" with all stuck tracks
   - ✅ Shows "Flagged (X)" with flagged tracks after processing
   - ✅ Admin can view, approve, or reject tracks
   - ✅ No RLS blocking issues

3. **Database:**
   - ✅ All tracks processed **within 5 minutes** of upload
   - ✅ Tracks have proper moderation status after processing
   - ✅ Transcription data populated (if enabled)
   - ✅ Industry-standard moderation speed

---

## ⚠️ **IMPORTANT NOTES**

### **Cron Job Authentication**
The cron job requires `CRON_SECRET` in the Authorization header. Vercel automatically adds this when calling cron jobs, but if testing manually, you must include it:

```bash
Authorization: Bearer ${CRON_SECRET}
```

### **Admin Settings**
If `auto_moderation_enabled` is `false` in `admin_settings`, the cron job will skip processing. Ensure it's set to `true`:

```sql
UPDATE admin_settings
SET auto_moderation_enabled = true
WHERE id = 1;
```

### **Service Role Key**
The admin panel API now uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. This is **required** for admin access. Ensure this environment variable is set in Vercel.

---

## 🔍 **TROUBLESHOOTING**

### **Cron Job Still Not Running**

1. **Check Vercel Cron Configuration:**
   - Go to Vercel Dashboard → Settings → Cron Jobs
   - Verify `/api/cron/moderate-content` is listed
   - Check "Last Run" timestamp
   - Verify schedule is `*/5 * * * *`

2. **Check Function Logs:**
   - Go to Vercel Dashboard → Functions
   - Find `/api/cron/moderate-content`
   - Check logs for errors

3. **Check Environment Variables:**
   - Verify `CRON_SECRET` is set
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set
   - Verify `OPENAI_API_KEY` is set

4. **Check Admin Settings:**
   ```sql
   SELECT auto_moderation_enabled FROM admin_settings WHERE id = 1;
   ```
   Should return `true`

### **Admin Panel Still Shows Empty**

1. **Check API Response:**
   - Open browser DevTools → Network tab
   - Go to admin panel
   - Check `/api/admin/moderation/queue?filter=pending` request
   - Verify response contains tracks

2. **Check Service Role Key:**
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
   - Should start with `eyJ...` (JWT token)

3. **Check RLS Policies:**
   - Verify admin user has role in `user_roles` table
   - Run: `SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID'`

4. **Check Database:**
   ```sql
   SELECT COUNT(*) FROM audio_tracks 
   WHERE moderation_status = 'pending_check' 
   AND deleted_at IS NULL;
   ```
   Should return 8 (or current count)

---

## ✅ **VERIFICATION**

After deployment, verify:

1. ✅ Cron job runs every 5 minutes (check Vercel logs)
2. ✅ Admin panel shows pending tracks
3. ✅ Tracks are processed within 5 minutes of upload
4. ✅ Admin can approve/reject tracks
5. ✅ No errors in Vercel function logs
6. ✅ Professional-grade moderation system

---

## 📞 **SUPPORT**

If issues persist after deployment:

1. Check Vercel function logs
2. Check Supabase logs
3. Verify all environment variables are set
4. Verify admin_settings table has correct values
5. Test cron endpoint manually with curl

---

**Status:** ✅ Deployed with Pro Plan (5-minute cron enabled)  
**Priority:** 🔴 CRITICAL  
**Estimated Fix Time:** Immediate after deployment  
**Note:** Pro plan upgrade completed - 5-minute cron jobs now active ✅

---

**Web Team**  
December 23, 2024

