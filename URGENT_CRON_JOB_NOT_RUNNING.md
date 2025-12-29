# 🚨 URGENT: Cron Job Not Running + Admin Panel Can't See Pending Tracks

**Date:** December 23, 2024  
**Priority:** 🔴 CRITICAL  
**From:** Mobile Team  
**To:** Web Team  

---

## 🔴 **CRITICAL ISSUES CONFIRMED**

### **Issue 1: Moderation Cron Job NOT Running**

**Evidence:**
```json
[
  {
    "title": "Lovely",
    "moderation_status": "pending_check",
    "created_at": "2025-12-18 19:08:26" // ⚠️ 5 DAYS AGO
  },
  {
    "title": "Healing in you",
    "moderation_status": "pending_check",
    "created_at": "2025-10-09 19:19:06" // ⚠️ 2.5 MONTHS AGO
  },
  {
    "title": "Healing",
    "moderation_status": "pending_check",
    "created_at": "2025-10-09 11:06:07" // ⚠️ 2.5 MONTHS AGO
  },
  {
    "title": "What a wonderful world",
    "moderation_status": "pending_check",
    "created_at": "2025-09-27 00:40:45" // ⚠️ 3 MONTHS AGO
  },
  {
    "title": "My sunshine",
    "moderation_status": "pending_check",
    "created_at": "2025-09-26 01:02:11" // ⚠️ 3 MONTHS AGO
  }
]
```

**Analysis:**
- ✅ 8 tracks uploaded successfully
- ✅ All have `moderation_status: "pending_check"`
- ❌ **NONE have been processed by AI**
- ❌ **Oldest track stuck for ~90 days**
- ❌ Cron job never ran or is failing silently

**Expected:** Within 5 minutes, status should change to `checking` → `clean` or `flagged`  
**Actual:** Status never changes from `pending_check`

---

### **Issue 2: Admin Panel Can't See Pending Tracks**

**Evidence:**
- Admin panel shows: **"Pending (0)"**
- Database shows: **8 tracks with `pending_check` status**
- RLS SQL fix applied: ✅ `FIX_MODERATION_PAGE_RLS.sql` was run
- Admin role confirmed: ✅ `asibechetachukwu@gmail.com` has role='admin'

**Expected:** "Pending" tab should show all 8 tracks  
**Actual:** "Pending" tab shows empty

**This suggests:**
1. RLS policy is still blocking admin access OR
2. Frontend query is not including `pending_check` status OR
3. Frontend is using wrong user context

---

## 🔍 **DIAGNOSIS QUESTIONS**

### **1. Is the cron job deployed and running?**

**Check Vercel Cron Jobs:**
```
1. Go to: https://vercel.com/your-project/settings/cron-jobs
2. Look for: "Moderate Audio Tracks" (runs every 5 minutes)
3. Check "Last Run" timestamp
4. Check "Status" (should be "Active")
```

**Expected cron endpoint:**
```
POST /api/cron/moderate-audio
Schedule: */5 * * * * (every 5 minutes)
```

**Questions:**
- [ ] Is the cron job visible in Vercel dashboard?
- [ ] What's the "Last Run" timestamp?
- [ ] Are there any errors in the logs?
- [ ] What's the HTTP response code? (should be 200)

### **2. Check Vercel Function Logs**

**Request:** Share logs from `/api/cron/moderate-audio`

Look for:
```
✅ "Processing X tracks for moderation"
✅ "Track {id} checked: status={clean/flagged}"
❌ "Error: Failed to fetch tracks"
❌ "Error: OpenAI API timeout"
❌ "Error: Supabase connection failed"
```

**Time range:** Last 7 days

### **3. Is the cron endpoint protected?**

```typescript
// Check if endpoint has this guard:
if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

**Vercel might be sending requests without proper auth header**, causing silent failures.

### **4. What's the admin panel query?**

**Request:** Share the actual Supabase query used in the admin panel

Expected:
```typescript
const { data, error } = await supabase
  .from('audio_tracks')
  .select('*')
  .in('moderation_status', ['pending_check', 'checking', 'flagged'])
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

**Is this correct?** Yes / No

### **5. Is the admin panel using service_role key?**

**Critical:** Admin panel MUST use `service_role` key to bypass RLS

```typescript
// ❌ Wrong (uses RLS):
const supabase = createClient(url, anonKey);

// ✅ Correct (bypasses RLS):
const supabase = createClient(url, serviceRoleKey);
```

**Which one is your admin panel using?**

---

## 🔧 **IMMEDIATE WORKAROUNDS**

### **Workaround 1: Manually Approve All Stuck Tracks**

Run this in Supabase SQL Editor:

```sql
-- Approve all pending tracks
UPDATE audio_tracks
SET 
  moderation_status = 'approved',
  moderation_checked_at = NOW(),
  moderation_flagged = false,
  reviewed_by = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e', -- Your admin user ID
  reviewed_at = NOW()
WHERE moderation_status = 'pending_check'
  AND deleted_at IS NULL
RETURNING id, title, moderation_status;
```

**This will:**
- ✅ Unblock all 8 tracks
- ✅ Make them playable in mobile app
- ✅ Remove them from pending review

### **Workaround 2: Manually Trigger Moderation Check**

If you have access to run API endpoints directly:

```bash
# Using curl
curl -X POST https://www.soundbridge.live/api/cron/moderate-audio \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# Expected response:
{
  "success": true,
  "processed": 8,
  "results": [...]
}
```

### **Workaround 3: Test with Manual Flag**

To test if admin panel can see anything:

```sql
-- Manually flag one track
UPDATE audio_tracks
SET 
  moderation_status = 'flagged',
  moderation_flagged = true,
  flag_reasons = ARRAY['Manual test flag'],
  moderation_confidence = 0.85
WHERE title = 'Lovely'
  AND deleted_at IS NULL
RETURNING id, title, moderation_status;
```

Then check admin panel:
- If "Flagged (1)" appears → RLS is working, query issue
- If still "Flagged (0)" → RLS is blocking access

---

## 📊 **ROOT CAUSE ANALYSIS**

### **Why Cron Job Might Not Be Running:**

**Possibility 1: Never Deployed to Vercel**
```
Code exists in repo, but not deployed to production
→ Check: Is /api/cron/moderate-audio accessible?
→ Test: curl https://www.soundbridge.live/api/cron/moderate-audio
```

**Possibility 2: Vercel Cron Not Configured**
```
Endpoint exists, but Vercel cron job not set up
→ Check: Vercel dashboard > Settings > Cron Jobs
→ Fix: Add cron job via vercel.json or dashboard
```

**Possibility 3: Environment Variables Missing**
```
OPENAI_API_KEY or ASSEMBLY_AI_KEY not set in Vercel
→ Check: Vercel dashboard > Settings > Environment Variables
→ Required vars:
  - OPENAI_API_KEY
  - ASSEMBLY_AI_KEY (if using Assembly)
  - CRON_SECRET
```

**Possibility 4: Failing Silently**
```
Cron runs but throws errors, doesn't update tracks
→ Check: Vercel function logs
→ Look for: try/catch blocks swallowing errors
```

**Possibility 5: Wrong Database Connection**
```
Cron job connecting to staging DB instead of production
→ Check: SUPABASE_URL env var in Vercel
→ Should match: https://your-project.supabase.co
```

### **Why Admin Panel Can't See Tracks:**

**Possibility 1: Query Doesn't Include 'pending_check'**
```typescript
// ❌ Wrong:
.in('moderation_status', ['flagged', 'rejected'])

// ✅ Correct:
.in('moderation_status', ['pending_check', 'checking', 'flagged'])
```

**Possibility 2: Using Anon Key Instead of Service Role**
```typescript
// ❌ Wrong (RLS blocks):
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ✅ Correct (bypasses RLS):
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
```

**Possibility 3: RLS Policy Missing Condition**
```sql
-- Check current policy:
SELECT * FROM pg_policies 
WHERE tablename = 'audio_tracks' 
  AND policyname LIKE '%admin%';

-- Should have:
CREATE POLICY "Admins can view all tracks"
ON audio_tracks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
```

---

## 🎯 **ACTION ITEMS**

### **For Web Team (URGENT):**

1. **Cron Job Investigation:**
   - [ ] Check if `/api/cron/moderate-audio` exists and is deployed
   - [ ] Check Vercel cron job configuration
   - [ ] Check Vercel function logs for errors
   - [ ] Verify environment variables (OPENAI_API_KEY, etc.)
   - [ ] Manually trigger endpoint and share response
   - [ ] If broken, fix and redeploy ASAP

2. **Admin Panel Investigation:**
   - [ ] Share the Supabase query used in admin panel
   - [ ] Confirm using `service_role` key (not `anon`)
   - [ ] Check if query includes `pending_check` status
   - [ ] Test with manually flagged track
   - [ ] Share frontend code: `/app/admin/moderation/page.tsx`

3. **Immediate Fix:**
   - [ ] Run "Workaround 1" SQL to approve stuck tracks
   - [ ] Deploy cron job fix
   - [ ] Upload test track and verify it processes within 5 minutes

### **For Mobile Team (Us):**

1. **Immediate:**
   - [x] ✅ Run diagnostic queries
   - [x] ✅ Identify stuck tracks
   - [x] ✅ Confirm cron job not running
   - [x] ✅ Send urgent report to web team
   - [ ] ⏳ Wait for web team fix

2. **After Fix:**
   - [ ] Upload test track
   - [ ] Verify it processes within 5 minutes
   - [ ] Test appeal workflow
   - [ ] Test playability blocking

---

## 📈 **EXPECTED TIMELINE**

**Immediate (Today):**
- Run "Workaround 1" to unblock stuck tracks
- Investigate why cron job isn't running

**Short-term (1-2 days):**
- Fix and redeploy cron job
- Fix admin panel RLS/query issue
- Test with new upload

**Long-term (1 week):**
- Add monitoring/alerts for stuck tracks
- Add timeout fallback (auto-approve after 1 hour)
- Add admin dashboard for cron job status

---

## 📞 **CONTACT**

**Mobile Team:**
- Email: asibechetachukwu@gmail.com
- Urgent: Please prioritize this as it's blocking content moderation entirely

**Current Impact:**
- ❌ No tracks can be approved/rejected automatically
- ❌ Admin panel shows empty (can't manually review)
- ❌ 8 tracks stuck for up to 3 months
- ⚠️ Users can't upload new content (will also get stuck)

---

**Please respond with:**
1. Cron job status from Vercel dashboard
2. Function logs from `/api/cron/moderate-audio`
3. Admin panel Supabase query
4. ETA for fix

---

**Mobile Team**  
December 23, 2024  
Priority: 🔴 CRITICAL

