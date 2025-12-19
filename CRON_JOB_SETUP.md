# Vercel Cron Job Setup Guide

**Purpose:** Automate content moderation for uploaded tracks
**Cost:** £0/month (included with Vercel)

---

## How It Works

The cron job runs **every 5 minutes** and:

1. Checks for tracks with `moderation_status = 'pending_check'`
2. Processes up to 10 tracks per batch
3. Transcribes audio (Whisper)
4. Checks for harmful content (OpenAI)
5. Detects spam patterns
6. Updates database with results
7. Adds flagged tracks to admin review queue

**Timeline:**
- Upload → Live in ~30 seconds ✅
- Moderation check → Within 5 minutes
- Admin review → If flagged

---

## Environment Variables Required

Add these to your Vercel project:

### 1. Supabase Credentials

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to find:**
- Supabase Dashboard → Settings → API
- Service Role Key (keep secret!)

### 2. OpenAI API Key

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**How to get:**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Add to Vercel environment variables

**Cost:** £0/month (2M free requests/month)

### 3. Cron Secret (Security)

```bash
CRON_SECRET=your-random-secret-string-here
```

**Generate a secure secret:**
```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: OpenSSL
openssl rand -hex 32

# Option 3: Online
# Use https://www.random.org/strings/
```

**Example output:**
```
a7f3d8e2c4b6f9a1e3d7c5b9f2a4e6d8c1b3f5a7e9d2c4b6f8a1e3d5c7b9f2a4
```

### 4. Optional: Moderation Configuration

```bash
MODERATION_BATCH_SIZE=10  # Number of tracks to process per cron run
WHISPER_SERVICE_URL=https://your-whisper-server.railway.app  # If using external Whisper server
```

---

## Vercel Setup

### Step 1: Add Environment Variables

1. Open Vercel Dashboard → Your Project
2. Click **Settings** → **Environment Variables**
3. Add all variables above:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `CRON_SECRET`
   - `MODERATION_BATCH_SIZE` (optional)

4. Set environment: **Production** (and Preview if needed)
5. Click **Save**

### Step 2: Deploy with Cron Configuration

The cron job is configured in `apps/web/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/moderate-content",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Schedule format:** Cron expression
- `*/5 * * * *` = Every 5 minutes
- `0 * * * *` = Every hour at minute 0
- `0 0 * * *` = Every day at midnight

**Deploy:**
```bash
git add .
git commit -m "Add cron job for content moderation"
git push origin main
```

Vercel will automatically detect the cron configuration.

### Step 3: Verify Cron Job

1. Go to Vercel Dashboard → Your Project
2. Click **Cron Jobs** tab
3. You should see: `POST /api/cron/moderate-content` scheduled every 5 minutes

**First run:** Within 5 minutes of deployment

---

## Testing the Cron Job

### Manual Test (Before Deploying)

Test the cron endpoint locally:

```bash
# Set up environment variables in .env.local
CRON_SECRET=test-secret-123
OPENAI_API_KEY=sk-your-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run dev server
npm run dev

# Call the cron endpoint (in another terminal)
curl -X GET http://localhost:3000/api/cron/moderate-content \
  -H "Authorization: Bearer test-secret-123"
```

**Expected response:**
```json
{
  "success": true,
  "message": "Content moderation job completed",
  "result": {
    "processed": 3,
    "flagged": 1,
    "errors": 0
  }
}
```

### Manual Test (Production)

```bash
curl -X GET https://soundbridge.live/api/cron/moderate-content \
  -H "Authorization: Bearer your-actual-cron-secret"
```

### View Cron Job Logs

1. Vercel Dashboard → Your Project
2. Click **Logs** tab
3. Filter by: `/api/cron/moderate-content`
4. Check for successful runs and any errors

---

## Monitoring

### Check Moderation Status

Query Supabase to see moderation progress:

```sql
-- Pending moderation
SELECT COUNT(*) as pending
FROM audio_tracks
WHERE moderation_status = 'pending_check';

-- Recently moderated
SELECT
  id,
  title,
  moderation_status,
  moderation_checked_at,
  moderation_flagged
FROM audio_tracks
WHERE moderation_checked_at > NOW() - INTERVAL '1 hour'
ORDER BY moderation_checked_at DESC;

-- Flagged content
SELECT
  id,
  title,
  artist_name,
  flag_reasons,
  moderation_confidence
FROM audio_tracks
WHERE moderation_flagged = true
ORDER BY moderation_checked_at DESC;
```

### Admin Dashboard

The admin dashboard (Phase 6) will show:
- Pending moderation count
- Flagged content queue
- Moderation statistics
- Recent activity

---

## Troubleshooting

### Issue: Cron job not running

**Check:**
1. Verify `vercel.json` is in the correct location (`apps/web/vercel.json`)
2. Check Vercel Dashboard → Cron Jobs tab
3. Ensure latest deployment includes the cron configuration

**Solution:**
```bash
# Redeploy
git commit --allow-empty -m "Trigger cron job setup"
git push origin main
```

### Issue: "Unauthorized" error

**Check:** `CRON_SECRET` environment variable matches the one used in requests

**Solution:**
1. Generate new secret
2. Update Vercel environment variable
3. Redeploy

### Issue: "OPENAI_API_KEY not set"

**Solution:**
1. Add `OPENAI_API_KEY` to Vercel environment variables
2. Redeploy

### Issue: Tracks stuck in "checking" status

**Cause:** Cron job crashed mid-processing

**Solution:**
Reset stuck tracks:
```sql
UPDATE audio_tracks
SET moderation_status = 'pending_check'
WHERE moderation_status = 'checking'
AND moderation_checked_at < NOW() - INTERVAL '10 minutes';
```

### Issue: Cron job timeout (>5 minutes)

**Cause:** Processing too many tracks or slow Whisper transcription

**Solution:**
1. Reduce `MODERATION_BATCH_SIZE` (default: 10 → try 5)
2. Use faster Whisper model (`base` → `tiny`)
3. Enable sample-only mode (first 2 minutes)

---

## Cron Job Schedule Options

Change the schedule in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/moderate-content",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Common schedules:**
- `*/5 * * * *` = Every 5 minutes (recommended)
- `*/10 * * * *` = Every 10 minutes
- `*/15 * * * *` = Every 15 minutes
- `0 * * * *` = Every hour
- `0 */2 * * *` = Every 2 hours

**Processing capacity:**

| Schedule | Tracks/Day (10/batch) | Recommended For |
|----------|----------------------|-----------------|
| Every 5 min | ~2,880 tracks | High volume (100-1,000 uploads/day) |
| Every 10 min | ~1,440 tracks | Medium volume (50-100 uploads/day) |
| Every 15 min | ~960 tracks | Low volume (<50 uploads/day) |

---

## Cost Breakdown

### Vercel Cron (Free)
- Included with all Vercel plans
- Unlimited cron jobs
- **Cost:** £0/month ✅

### OpenAI Moderation API (Free Tier)
- 2 million requests/month free
- ~2,880 tracks/day = 86,400/month
- Well within free tier
- **Cost:** £0/month ✅

### Whisper (Self-Hosted)
- Railway free tier: 500 hours/month
- ~7 seconds/track = 0.002 hours/track
- Can handle 250,000 tracks/month
- **Cost:** £0/month ✅

**Total:** £0/month for up to 86,000 tracks/month

---

## Security Best Practices

1. **Never commit secrets to Git**
   - Use `.env.local` for local development
   - Use Vercel environment variables for production

2. **Use service role key only on server**
   - Never expose in client-side code
   - Keep `SUPABASE_SERVICE_ROLE_KEY` in server environment only

3. **Rotate cron secret periodically**
   - Generate new secret every 3-6 months
   - Update Vercel environment variable

4. **Monitor cron job logs**
   - Check for unauthorized access attempts
   - Review error patterns

---

## Next Steps

After setting up the cron job:

1. ✅ Add environment variables to Vercel
2. ✅ Deploy to production
3. ✅ Verify cron job in Vercel Dashboard
4. ✅ Test with a sample upload
5. ✅ Monitor logs for first few runs
6. ✅ Proceed to Phase 6: Admin dashboard updates

---

*Cron Job Setup Guide - December 17, 2025*
*Part of SoundBridge Content Moderation System - Phase 5*
