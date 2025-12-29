# 🧪 TEST: Admin Panel API Endpoint

**Purpose:** Diagnose why admin panel shows empty

---

## TEST 1: Check Database Status

Run in Supabase SQL Editor:

```sql
-- Are tracks still in pending_check?
SELECT 
  moderation_status,
  COUNT(*) as count,
  ARRAY_AGG(title) as sample_tracks
FROM audio_tracks
WHERE deleted_at IS NULL
GROUP BY moderation_status;
```

**Expected Results:**

**Scenario A: Still Pending**
```
moderation_status | count | sample_tracks
------------------|-------|------------------
pending_check     | 8     | ["Lovely", "Healing", ...]
```
**Interpretation:** Cron hasn't run yet, admin panel bug persists

**Scenario B: Processed**
```
moderation_status | count | sample_tracks
------------------|-------|------------------
clean             | 7     | ["Lovely", "Healing", ...]
flagged           | 1     | ["Some Track"]
```
**Interpretation:** Cron already ran! System is working!

---

## TEST 2: Test Admin API Directly

### Method A: Browser Console

1. Go to: https://www.soundbridge.live/admin/moderation
2. Open Console (F12)
3. Paste and run:

```javascript
// Test Pending tracks
fetch('/api/admin/moderation/queue?filter=pending')
  .then(r => r.json())
  .then(data => {
    console.log('Pending tracks:', data);
    console.log('Count:', data.tracks?.length || 0);
  });

// Test All tracks
fetch('/api/admin/moderation/queue?filter=all')
  .then(r => r.json())
  .then(data => {
    console.log('All tracks:', data);
    console.log('Count:', data.tracks?.length || 0);
  });
```

### Method B: cURL

```bash
# Get your session cookie from browser first
# Chrome: DevTools → Application → Cookies → sb-access-token

# Test pending
curl "https://www.soundbridge.live/api/admin/moderation/queue?filter=pending" \
  -H "Cookie: sb-access-token=YOUR_TOKEN_HERE"

# Test all
curl "https://www.soundbridge.live/api/admin/moderation/queue?filter=all" \
  -H "Cookie: sb-access-token=YOUR_TOKEN_HERE"
```

---

## TEST 3: Check Vercel Deployment

1. Ask web team: "Has the fix been deployed to production?"
2. Check commit hash on production
3. Verify it includes the admin panel fixes

---

## TEST 4: Check Vercel Function Logs

Ask web team to check:
1. Go to Vercel Dashboard
2. Functions → `/api/admin/moderation/queue`
3. Check recent logs
4. Look for errors or empty responses

---

## 📊 INTERPRETATION GUIDE

### Result: Database shows `pending_check` (8 tracks)

**Admin API returns empty:**
→ Admin panel bug still exists
→ Fixes not deployed or not working
→ Need web team to investigate

**Admin API returns tracks:**
→ Frontend display bug
→ Check React component rendering

### Result: Database shows `clean` or `approved`

→ ✅ Cron job already ran successfully!
→ ✅ System is working!
→ Tracks processed, admin panel correctly shows empty
→ Test by uploading new track

### Result: Database empty

→ Tracks were deleted
→ Need to upload new test tracks

---

## 🎯 NEXT STEPS BASED ON RESULTS

| Database Status | API Response | Action |
|----------------|--------------|--------|
| `pending_check` (8) | Empty `[]` | Bug persists, escalate to web team |
| `pending_check` (8) | Has tracks | Frontend bug, check React code |
| `clean`/`approved` | Empty `[]` | ✅ System working! Upload test track |
| Empty | N/A | Upload new tracks to test |

---

## 📞 QUESTIONS FOR WEB TEAM

If admin API still returns empty:

1. Has the fix been deployed to production?
2. What's the current commit SHA on production?
3. Can you check the function logs for `/api/admin/moderation/queue`?
4. Can you manually query the database as service_role and confirm RLS is bypassed?
5. Can you test the endpoint from Vercel dashboard?

---

**Run TEST 1 first, then tell me the results!**

