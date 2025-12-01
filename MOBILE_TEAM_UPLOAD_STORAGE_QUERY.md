# 📱 Mobile Team Query: Upload Storage Buckets & Upload Flow

**Date:** November 29 2025  
**From:** Mobile App Development Team  
**To:** Web App Development Team  
**Subject:** Storage Bucket Names & Upload Implementation Details  
**Priority:** 🟢 **HIGH** - Blocking Track/Podcast Uploads  
**Status:** ❓ **AWAITING RESPONSE**

---

## 🚨 **ISSUE**

The mobile app is trying to upload audio tracks and podcast episodes, but we need clarification on:

1. **Storage bucket names** - What are the exact bucket names in Supabase Storage?
2. **Upload flow** - Should we use direct Supabase Storage uploads or API endpoints?
3. **File path structure** - What path format should we use for uploaded files?

---

## ❓ **QUESTIONS**

### **1. Storage Bucket Names**

**What are the exact bucket names for:**
- Audio files (music tracks and podcast episodes)?
- Cover artwork/album art?
- User avatars?
- Event images?
- Post images/attachments?

**Current assumptions (need confirmation):**
- `audio-files` - for audio tracks
- `artwork` - for cover art
- `avatars` - for profile pictures
- `event-images` - for event images

**Are these correct?** If not, please provide the exact bucket names.

---

### **2. Upload Method**

**Should the mobile app:**
- **Option A:** Upload directly to Supabase Storage using `supabase.storage.from('bucket-name').upload()`?
- **Option B:** Use API endpoints (e.g., `/api/tracks/upload` or `/api/upload/audio`)?
- **Option C:** A combination (upload file to storage, then call API to create record)?

**Current mobile implementation:**
- We're using direct Supabase Storage uploads
- Then creating records in `audio_tracks` table via Supabase client

**Is this the correct approach?** Or should we use your API endpoints?

---

### **3. File Path Structure**

**What path structure should we use for uploaded files?**

**Current mobile implementation:**
- Audio files: `${userId}/${timestamp}-${filename}`
- Images: `${userId}/${folder}/${timestamp}-${filename}`

**Example:**
- Audio: `295cb70d-5a5a-47fc-ba7e-c6dc8c4512ce/1735123456789-track.mp3`
- Artwork: `295cb70d-5a5a-47fc-ba7e-c6dc8c4512ce/cover-art/1735123456789-cover.jpg`

**Is this format acceptable?** Or do you have a specific path structure requirement?

---

### **4. Upload API Endpoints (If Applicable)**

**If we should use API endpoints instead, please provide:**

**Audio Upload:**
- Endpoint: `POST /api/tracks/upload` or `POST /api/upload/audio`?
- Request format: FormData with field name `file` or `audio`?
- Response format: `{ success: true, data: { url: "...", ... } }`?

**Image Upload:**
- Endpoint: `POST /api/upload/image` or `POST /api/artwork/upload`?
- Request format: FormData with field name `file` or `image`?
- Response format: `{ success: true, data: { url: "...", ... } }`?

**Track Creation:**
- Endpoint: `POST /api/tracks` or `POST /api/audio-tracks`?
- Request body format: JSON with all track metadata?
- Response format: `{ success: true, data: { id: "...", ... } }`?

---

### **5. Storage Policies & Permissions**

**What RLS (Row Level Security) policies are set up for storage buckets?**

**Current mobile assumptions:**
- Users can upload to their own folder: `${userId}/...`
- Public read access for all files
- Users can only modify/delete their own files

**Are these assumptions correct?** Or do we need different permissions?

---

### **6. File Size Limits**

**What are the file size limits for:**
- Audio files (tracks/podcasts): 100MB? 200MB? Other?
- Images (cover art): 10MB? 5MB? Other?
- Post attachments: 10MB? Other?

**Current mobile limits:**
- Audio: 100MB
- Images: 10MB

**Are these correct?**

---

### **7. Supported File Types**

**What file types are supported for:**
- Audio: MP3, WAV, M4A, AAC, OGG, FLAC? Others?
- Images: JPG, PNG, WEBP? Others?

**Current mobile support:**
- Audio: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/m4a`, `audio/aac`, `audio/ogg`, `audio/flac`
- Images: `image/jpeg`, `image/png`, `image/webp`

**Are these correct?**

---

### **8. Track Creation Fields**

**When creating a track record in `audio_tracks` table, which fields are:**
- **Required?**
- **Optional?**
- **Auto-generated?** (e.g., `id`, `created_at`, `play_count`)

**Current mobile payload:**
```typescript
{
  creator_id: string,
  title: string,
  description?: string | null,
  file_url: string,
  cover_art_url?: string | null,
  artwork_url?: string | null, // Also set for compatibility
  duration?: number | null,
  tags?: string[] | null,
  is_public?: boolean,
  genre?: string | null,
  lyrics?: string | null,
  lyrics_language?: string | null,
  has_lyrics?: boolean
}
```

**Is this correct?** Are we missing any required fields?

---

## 📋 **CURRENT MOBILE IMPLEMENTATION**

**Upload Service (`src/services/UploadService.ts`):**

```typescript
// Audio upload
await supabase.storage
  .from('audio-files')  // ❓ Need confirmation on bucket name
  .upload(`${userId}/${timestamp}-${filename}`, blob, {
    contentType: audioFile.type,
    upsert: false,
  });

// Image upload
await supabase.storage
  .from('artwork')  // ❓ Need confirmation on bucket name
  .upload(`${userId}/${folder}/${timestamp}-${filename}`, blob, {
    contentType: imageFile.type,
    upsert: false,
  });

// Track creation
await supabase
  .from('audio_tracks')
  .insert({
    creator_id: userId,
    title: trackData.title,
    file_url: publicUrl,
    // ... other fields
  });
```

---

## 🎯 **WHAT WE NEED**

1. **Exact bucket names** for all storage types
2. **Upload method** (direct storage vs API endpoints)
3. **File path structure** requirements
4. **API endpoint details** (if using API instead of direct storage)
5. **Storage policy confirmation** (RLS/permissions)
6. **File size limits** confirmation
7. **Supported file types** confirmation
8. **Track creation field requirements** confirmation

---

## ⚠️ **CURRENT ERROR**

**Error when trying to upload:**
```
TypeError: supabaseFunctions.uploadAudioFile is not a function (it is undefined)
```

**This was fixed by creating UploadService, but we need to confirm:**
- Correct bucket names
- Correct upload method
- Correct file paths

---

## 📝 **ADDITIONAL CONTEXT**

- Mobile app is using React Native with Expo
- Using `@supabase/supabase-js` for Supabase client
- Files are selected using `expo-document-picker` and `expo-image-picker`
- Files are converted to Blob format before upload

---

## ✅ **NEXT STEPS**

Once we receive this information, we will:
1. Update `UploadService.ts` with correct bucket names
2. Adjust upload method if API endpoints are preferred
3. Update file path structure if needed
4. Test upload functionality end-to-end
5. Confirm everything works with your backend

---

**Thank you for your assistance!** 🙏

Please provide the information above so we can complete the upload functionality.

