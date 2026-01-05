# ⏳ Backend Audio Sampling - Deployment Pending

**Date:** January 5, 2026
**Status:** 🟡 **CODE READY - DEPLOYMENT PENDING**
**Issue:** Backend audio sampling implemented but not deployed to production

---

## 🎯 Current Situation

### What's Happening

You're still seeing **HTTP 413 errors** when uploading files > 10 MB because:

1. ✅ **Backend code is written** - Audio sampling implementation is complete
2. ❌ **Backend NOT deployed to production** - Still using old code without sampling
3. ✅ **Mobile app is ready** - Temporarily has 10 MB check to avoid 413 errors

### Error You're Seeing

```
🔍 Response status: 413
❌ API returned error status: 413
❌ Error response: Request Entity Too Large

FUNCTION_PAYLOAD_TOO_LARGE
lhr1::tddxn-1767636189822-d43cb685000d
```

**This is a Vercel infrastructure error** - the backend function is rejecting the payload before it even gets to the audio sampling code.

---

## 📊 Current State

| Component | Status | Details |
|-----------|--------|---------|
| **Mobile App** | 🟡 Temporary limit | Has 10 MB check until backend deploys |
| **Backend Code** | ✅ Complete | Audio sampling code written |
| **Backend Deployment** | ❌ Pending | Not deployed to production |
| **Production Status** | ❌ Limited | Files > 10 MB still fail |

---

## 🔧 What Mobile App Does Now (Temporary)

### Code Behavior

```typescript
// TEMPORARY: Backend audio sampling not yet deployed to production
const MAX_FINGERPRINT_SIZE = 10 * 1024 * 1024; // 10 MB

if (file.size > MAX_FINGERPRINT_SIZE) {
  // Skip fingerprinting to avoid 413 error
  setAcrcloudError(`File size (${fileSizeMB} MB) exceeds current limit.
    Backend audio sampling deployment pending.
    Track will be reviewed manually.`);
  return;
}
```

### User Experience

**Files < 10 MB:**
- ✅ Fingerprinting works normally
- ✅ ISRC verification works
- ✅ No errors

**Files > 10 MB:**
- ⚠️ Shows inline message: "File size (13.3 MB) exceeds current limit. Backend audio sampling deployment pending. Track will be reviewed manually."
- ✅ Upload can still proceed
- ⚠️ Flagged for manual review (no automatic fingerprinting)
- ❌ No ISRC verification

---

## 🚨 What Backend Team Needs to Do

### 1. Verify Code is Deployed

**Check production backend:**

```bash
# SSH into production server or check Vercel dashboard
# Look for these files with the audio sampling code:
# - apps/web/app/api/upload/fingerprint/route.ts (should have extractAudioSample function)
# - apps/web/package.json (should have fluent-ffmpeg@^2.1.3)
```

### 2. Verify ffmpeg is Available

**On Vercel, you need ONE of:**

**Option A: Install @ffmpeg-installer/ffmpeg**
```bash
npm install @ffmpeg-installer/ffmpeg
```

**Option B: Use Custom Docker Build**
```dockerfile
FROM node:18
RUN apt-get update && apt-get install -y ffmpeg
COPY . .
RUN npm install
CMD ["npm", "start"]
```

**Option C: Vercel Enterprise Build**
- Contact Vercel support to enable ffmpeg in build environment

### 3. Set Function Timeout

**Update `vercel.json`:**
```json
{
  "functions": {
    "api/upload/fingerprint.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

### 4. Deploy to Production

```bash
# Commit changes
git add .
git commit -m "feat: add audio sampling for ACRCloud fingerprinting"
git push origin main

# Or trigger manual deploy in Vercel dashboard
```

### 5. Test Deployment

**After deploying, test with:**

```bash
# Upload a 15 MB file via API
curl -X POST https://www.soundbridge.live/api/upload/fingerprint \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audioFile=@test_15mb.mp3"
```

**Expected logs (backend):**
```
📦 Large file detected: 15.0 MB
🎬 Extracting 30-second audio sample...
✅ Audio sample extraction complete
✅ Sample extracted: 1.5 MB
```

**Should NOT see:**
```
❌ FUNCTION_PAYLOAD_TOO_LARGE
❌ Request Entity Too Large
```

---

## 📋 Backend Deployment Checklist

- [ ] Verify `extractAudioSample` function exists in `/api/upload/fingerprint`
- [ ] Verify `fluent-ffmpeg` is in production dependencies
- [ ] Verify ffmpeg is available in production environment
- [ ] Verify function timeout is set to 60 seconds
- [ ] Deploy to production
- [ ] Test with 15 MB file
- [ ] Verify no 413 errors
- [ ] Verify "extracting sample" logs appear
- [ ] Verify ACRCloud receives sample
- [ ] Notify mobile team when complete

---

## 🔍 How to Verify Backend is Ready

### Backend Team Should See These Logs

**When a 15 MB file is uploaded:**

```
📁 Received file: track.mp3, size: 15.0 MB
📦 Large file detected: 15.0 MB
🎬 Extracting 30-second audio sample...
🎵 ffmpeg command: ffmpeg -ss 0 -i /tmp/upload_123.mp3 -t 30 -codec:a libmp3lame -b:a 128k /tmp/sample_123.mp3
✅ Audio sample extraction complete
✅ Sample extracted: 1.5 MB
✅ Sending sample to ACRCloud
✅ ACRCloud response received
```

**Should NOT see:**
```
❌ 413 Request Entity Too Large
❌ FUNCTION_PAYLOAD_TOO_LARGE
❌ Function timeout
```

---

## 📞 Communication Plan

### What to Ask Backend Team

**Message to send:**

> Hi Backend Team,
>
> I'm still seeing 413 errors when uploading files > 10 MB for ACRCloud fingerprinting. The error is:
>
> ```
> FUNCTION_PAYLOAD_TOO_LARGE
> lhr1::tddxn-1767636189822-d43cb685000d
> ```
>
> Has the audio sampling code been deployed to production yet?
>
> The code is ready in the repo (extractAudioSample function), but it doesn't seem to be running in production.
>
> Can you:
> 1. Verify the deployment includes the audio sampling code
> 2. Confirm ffmpeg is available in production
> 3. Check function timeout is set to 60 seconds
> 4. Test with a 15 MB file and share the backend logs
>
> Once deployed, I'll remove the temporary 10 MB limit from the mobile app.
>
> Thanks!

### What Backend Should Respond With

**Successful deployment response:**

> "Audio sampling deployed! Here are the test results:
>
> - Uploaded 15 MB file ✅
> - Sample extracted: 1.5 MB ✅
> - ACRCloud processed successfully ✅
> - No 413 errors ✅
>
> Logs:
> ```
> 📦 Large file detected: 15.0 MB
> 🎬 Extracting 30-second audio sample...
> ✅ Sample extracted: 1.5 MB
> ```
>
> Production is ready for large files!"

---

## ⏭️ Next Steps

### Mobile Team (You)

1. **Current state:**
   - ✅ Mobile app has temporary 10 MB limit
   - ✅ Graceful error message shown
   - ✅ Users can still upload (manual review)

2. **Wait for backend deployment**
   - ⏳ Backend team deploys audio sampling
   - ⏳ Backend team confirms deployment with test

3. **Remove temporary limit**
   - Once backend confirms deployment
   - Remove the 10 MB check from mobile app
   - Test with 15 MB file
   - Verify no 413 errors

### Backend Team

1. **Deploy audio sampling to production**
2. **Test with 15 MB file**
3. **Share test results with mobile team**
4. **Confirm production is ready**

---

## 📊 Timeline

| Task | Status | Owner |
|------|--------|-------|
| Write audio sampling code | ✅ Complete | Backend |
| Deploy to production | ⏳ Pending | Backend |
| Test in production | ⏳ Pending | Backend |
| Remove mobile temp limit | ⏳ Waiting | Mobile |
| Final testing | ⏳ Waiting | Both |

---

## 🔗 Related Documentation

- [CRITICAL_BACKEND_AUDIO_SAMPLING_REQUIRED.md](CRITICAL_BACKEND_AUDIO_SAMPLING_REQUIRED.md) - Backend implementation guide
- [COMPLETE_ACRCLOUD_IMPLEMENTATION_VERIFIED.md](COMPLETE_ACRCLOUD_IMPLEMENTATION_VERIFIED.md) - Verification checklist
- [MOBILE_APP_READY_WAITING_FOR_BACKEND.md](MOBILE_APP_READY_WAITING_FOR_BACKEND.md) - Mobile status

---

## ✅ Summary

**Current State:**
- 🟡 Mobile app: Temporary 10 MB limit (to avoid 413 errors)
- ✅ Backend code: Audio sampling written
- ❌ Backend deployment: Not in production yet
- ❌ Production status: Files > 10 MB still fail

**What's Needed:**
- Backend team deploys audio sampling to production
- Backend team verifies deployment with test
- Mobile team removes temporary limit once confirmed

**Mobile app is doing everything correctly - just waiting for backend deployment.** ✅

---

**Status:** ⏳ Waiting for backend deployment
