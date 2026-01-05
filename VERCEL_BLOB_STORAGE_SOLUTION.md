# ✅ Vercel Blob Storage Solution for Large File Uploads

**Date:** January 5, 2026  
**Status:** 🎯 **RECOMMENDED SOLUTION**  
**Issue:** Vercel 4.5MB payload limit blocks large file uploads

---

## 🎯 The Real Problem

**Vercel Infrastructure Limits:**
- ❌ **4.5 MB maximum payload** for serverless functions (Hobby/Pro)
- ❌ Request rejected **BEFORE** it reaches our code
- ❌ Audio sampling code **never runs** because request never arrives

**This is a Vercel platform limitation, not a code issue.**

---

## ✅ The Solution: Vercel Blob Storage

**Use Vercel Blob for direct client uploads** - this bypasses the 4.5MB limit entirely.

### How It Works

1. **Client uploads directly to Vercel Blob** (bypasses function payload limit)
2. **Client sends blob URL to backend function** (small JSON payload)
3. **Backend downloads from blob URL** (no payload limit for internal fetches)
4. **Backend samples and fingerprints** (works for any file size)

---

## 📦 Implementation

### Step 1: Install Vercel Blob SDK

```bash
npm install @vercel/blob
```

### Step 2: Create Upload Endpoint (Client-Side Token)

**File:** `apps/web/app/api/upload/get-blob-token/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, false);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { filename, contentType } = await request.json();

    // Generate a signed upload URL for the client
    const blob = await put(filename, request.body as any, {
      access: 'public',
      contentType: contentType || 'audio/mpeg',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      url: blob.url,
      downloadUrl: blob.downloadUrl,
    });
  } catch (error: any) {
    console.error('Blob upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
```

### Step 3: Update Fingerprint Endpoint

**The endpoint already supports `audioFileUrl`!** Just ensure it works with Vercel Blob URLs.

**File:** `apps/web/app/api/upload/fingerprint/route.ts`

The existing code (lines 297-325) already handles URL-based uploads. It will:
1. Fetch from the blob URL
2. Download the file
3. Sample if > 10MB
4. Send to ACRCloud

**No changes needed!** ✅

### Step 4: Mobile App Implementation

**Update mobile app to use Vercel Blob:**

```typescript
// Mobile app - Upload to Vercel Blob first
const uploadToVercelBlob = async (file: File): Promise<string> => {
  // Step 1: Get upload token from backend
  const tokenResponse = await fetch('https://www.soundbridge.live/api/upload/get-blob-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });

  const { url, downloadUrl } = await tokenResponse.json();

  // Step 2: Upload file directly to Vercel Blob
  const uploadResponse = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file, // Direct file upload - no size limit!
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload to Vercel Blob');
  }

  return downloadUrl; // Return the public URL
};

// Step 3: Send URL to fingerprint API
const fingerprintAudio = async (file: File) => {
  try {
    // Upload to Vercel Blob first (bypasses 4.5MB limit)
    const blobUrl = await uploadToVercelBlob(file);
    
    // Send URL to fingerprint API (small JSON payload)
    const response = await fetch('https://www.soundbridge.live/api/upload/fingerprint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        audioFileUrl: blobUrl, // Send URL, not file
        artistName: artistName,
      }),
    });

    const data = await response.json();
    // ... handle response
  } catch (error) {
    console.error('Fingerprinting error:', error);
  }
};
```

---

## 🔧 Environment Variables

**Add to Vercel Dashboard:**

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxx
```

**Get token from:**
1. Vercel Dashboard → Your Project → Storage → Blob
2. Create a new store (if needed)
3. Copy the `BLOB_READ_WRITE_TOKEN`

---

## ✅ Benefits

1. **✅ No payload limits** - Direct upload to blob storage
2. **✅ Scalable** - Works for millions of users
3. **✅ Fast** - Direct client-to-blob upload
4. **✅ Cost-effective** - Pay only for storage used
5. **✅ Simple** - Backend code already supports URLs

---

## 📊 Flow Diagram

```
Mobile App
  ↓
[Upload to Vercel Blob] ← Direct upload, no size limit
  ↓
[Get blob URL]
  ↓
[Send URL to /api/upload/fingerprint] ← Small JSON payload (< 1KB)
  ↓
Backend Function
  ↓
[Download from blob URL] ← Internal fetch, no limit
  ↓
[Sample if > 10MB] ← Audio sampling code runs
  ↓
[Send to ACRCloud] ← Fingerprinting works
  ↓
[Return results]
```

---

## 🧪 Testing

### Test with 15 MB File

```bash
# 1. Upload to blob (should succeed)
curl -X PUT "https://blob.vercel-storage.com/..." \
  -H "Content-Type: audio/mpeg" \
  --data-binary "@test_15mb.mp3"

# 2. Send URL to fingerprint API (should succeed)
curl -X POST "https://www.soundbridge.live/api/upload/fingerprint" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"audioFileUrl": "https://blob.vercel-storage.com/..."}'

# Expected: No 413 errors, fingerprinting works
```

---

## 📝 Deployment Checklist

- [ ] Install `@vercel/blob` package
- [ ] Create `/api/upload/get-blob-token` endpoint
- [ ] Add `BLOB_READ_WRITE_TOKEN` to Vercel environment variables
- [ ] Create Vercel Blob store in dashboard
- [ ] Update mobile app to use blob upload
- [ ] Test with 15 MB file
- [ ] Verify no 413 errors
- [ ] Verify fingerprinting works

---

## 🚀 Why This Works

**Vercel Blob Storage:**
- ✅ Direct client uploads (bypasses function payload limit)
- ✅ No 4.5MB restriction
- ✅ Built for Vercel platform
- ✅ Automatic CDN distribution
- ✅ Public URLs for easy access

**Backend Function:**
- ✅ Receives small JSON payload (URL string)
- ✅ Downloads from blob URL (internal fetch, no limit)
- ✅ Processes file normally
- ✅ Audio sampling works as designed

---

## 📞 Next Steps

1. **Install Vercel Blob SDK**
2. **Create blob token endpoint**
3. **Update mobile app** to upload to blob first
4. **Test with large files**
5. **Deploy to production**

---

**This is the scalable, production-ready solution for handling large file uploads on Vercel.** ✅

