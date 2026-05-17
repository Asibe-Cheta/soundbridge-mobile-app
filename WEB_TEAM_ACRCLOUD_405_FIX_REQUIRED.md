# ACRCloud Fingerprinting — 405 Error (Backend Fix Required)

**Priority:** High — audio verification is broken for all uploads

---

## Symptom

The mobile app's Upload screen attempts to fingerprint uploaded audio via:

```
POST /api/upload/fingerprint
```

The backend is returning **HTTP 405 Method Not Allowed**, causing the UI to show:

> "Audio verification unavailable — API error 405: Fingerprinting failed. You can still proceed with upload."

Console log from the app:
```
❌ API returned error status: 405
❌ ACRCloud error: Error: API error 405:
```

---

## What the mobile app sends

```typescript
fetch(`${config.apiUrl}/upload/fingerprint`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({
    audioFileUrl: storageUrl,   // public Supabase storage URL
    artistName: formData.artistName || undefined,
  }),
})
```

The app uploads the audio file to `audio-tracks` Supabase storage first, then sends the public URL to your backend. Your backend is expected to fetch that URL and run ACRCloud fingerprinting on it.

---

## Possible Causes

1. **Route not registered** — `/api/upload/fingerprint` route was removed or never added to the POST router
2. **Route registered under GET instead of POST** — change to `router.post`
3. **Route registered without the `/api` prefix** — confirm the route is `POST /api/upload/fingerprint` not just `POST /upload/fingerprint`
4. **Middleware blocking POST to this path** — check if a read-only middleware is wrapping this route

---

## Expected Response Shape (success)

```json
{
  "success": true,
  "matchFound": true,
  "requiresISRC": true,
  "detectedArtist": "Artist Name",
  "detectedTitle": "Song Title",
  "detectedAlbum": "Album Name",
  "detectedISRC": "GBUM71234567",
  "artistMatch": { "match": true, "confidence": 0.95 },
  "artistMatchConfidence": 0.95
}
```

Or if no match (original music):

```json
{
  "success": true,
  "matchFound": false,
  "requiresISRC": false,
  "isUnreleased": true
}
```

Or on ACRCloud-level error (quota, timeout, etc.) — **do not return 4xx**, return 200 with:

```json
{
  "success": false,
  "matchFound": false,
  "error": "Quota exceeded",
  "errorCode": "QUOTA_EXCEEDED",
  "requiresManualReview": true
}
```

Valid `errorCode` values the mobile app handles: `"QUOTA_EXCEEDED"`, `"TIMEOUT"`, `"API_ERROR"`, `"INVALID_FILE"`

---

## Impact

- All uploads show a yellow warning box during the upload flow
- Cover song detection is disabled until fixed
- ISRC auto-population from ACRCloud is disabled

The app allows uploads to proceed despite this error (it does not block), but copyright verification is skipped.

---

## Notes

- This was working previously — likely a recent deployment broke the route registration
- Not a subscription issue (405 ≠ 402/429)
- The mobile code is correct; the fix is entirely server-side
