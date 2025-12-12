# ⏰ Cron Job Quick Reference Card

**For:** https://soundbridge.live  
**Purpose:** Automatically downgrade past-due subscriptions after 7-day grace period

---

## 🔗 Your Cron Job URL

```
https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_CRON_SECRET
```

**⚠️ Replace `YOUR_CRON_SECRET` with your actual secret from environment variables!**

---

## 📅 Schedule

```
0 0 * * *
```

**Meaning:** Daily at midnight UTC (00:00 UTC)

---

## ✅ Quick Setup Steps

1. **Go to:** https://www.easycron.com/ (or https://cron-job.org/)

2. **Sign up** (free)

3. **Create cron job:**
   - **URL:** Copy the URL above (replace secret)
   - **Method:** GET
   - **Schedule:** `0 0 * * *`
   - **Timeout:** 300 seconds

4. **Test:** Click "Run Now" to test

5. **Enable email notifications** for failures

6. **Enable the job** and save

---

## 🧪 Manual Test Command

```bash
curl "https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_CRON_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "No subscriptions to downgrade",
  "downgraded": 0
}
```

---

## 📋 What to Copy into Cron Service

### For EasyCron or cron-job.org:

**Job Title:**
```
SoundBridge - Downgrade Past Due Subscriptions
```

**URL:**
```
https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_CRON_SECRET
```

**HTTP Method:**
```
GET
```

**Schedule:**
```
0 0 * * *
```

**Timeout:**
```
300
```

**Notifications:**
```
✅ Enable email notifications for failures
```

---

## 🔐 Where to Find Your CRON_SECRET

1. **Local:** Check `.env.local` file
2. **Vercel:** Dashboard → Project → Settings → Environment Variables → Find `CRON_SECRET`

---

## ✅ Checklist

- [ ] Found my `CRON_SECRET`
- [ ] Created cron service account
- [ ] Created cron job with URL above (secret replaced)
- [ ] Set schedule to `0 0 * * *`
- [ ] Tested manually - got success response
- [ ] Enabled email notifications
- [ ] Enabled the cron job
- [ ] Ready to go! 🎉

---

**See `EXTERNAL_CRON_SETUP_GUIDE.md` for detailed step-by-step instructions.**
