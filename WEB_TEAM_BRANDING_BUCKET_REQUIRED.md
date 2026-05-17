# Web Team: Branding Logo Upload — Storage Bucket Required

**Date:** 2026-04-08  
**From:** Mobile team  
**Priority:** Medium — branding logo upload is blocked until this is resolved

---

## What's happening

The Branding Customisation screen allows Premium/Unlimited creators to upload a custom logo. The upload is hitting an RLS policy violation on the `profile-images` bucket:

```
Error: new row violates row-level security policy
```

We tried uploading to `profile-images/{userId}/branding/logo_*.jpg` as a workaround (since a dedicated `branding` bucket doesn't exist), but the RLS policy on `profile-images` is blocking it — likely because the policy only permits the root `{userId}/` path, not subfolders like `{userId}/branding/`.

---

## Required fix (pick one)

### Option A — Create a dedicated `branding` bucket (preferred)

```sql
-- 1. Create the bucket (public so logos are accessible without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true);

-- 2. Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own branding assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Allow users to update/replace their own branding assets
CREATE POLICY "Users can update their own branding assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Allow public read
CREATE POLICY "Branding assets are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'branding');

-- 5. Allow users to delete their own branding assets
CREATE POLICY "Users can delete their own branding assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

Once this is done, let the mobile team know and we'll switch the upload target back to the `branding` bucket.

### Option B — Update `profile-images` RLS to allow subfolders

If you'd prefer not to create a new bucket, update the `profile-images` INSERT policy to allow subfolder paths (not just root-level `{userId}/filename`):

```sql
-- The current policy likely checks:
-- (storage.foldername(name))[1] = auth.uid()::text
-- This already SHOULD allow subfolders since foldername()[1] returns the first segment.
-- If it's still blocked, check for a WITH CHECK that restricts depth:
-- e.g., array_length(string_to_array(name, '/'), 1) = 2  ← this would block subfolders

-- Fix: remove any depth restriction so {userId}/branding/file.jpg is allowed
```

Please check the exact policy definition and share it with us if Option B isn't straightforward.

---

## Mobile code status

- Upload logic uses `FileSystem.uploadAsync` (correct, no blob() issues)
- Currently targeting `profile-images` bucket as fallback — will switch to `branding` once created
- File path: `{userId}/branding/logo_{timestamp}.{ext}`
- Also note: `BrandingService.ts:50` logs `⚠️ RPC function not available, using direct query` — there's a missing RPC function for fetching branding settings, separate issue to investigate when ready
