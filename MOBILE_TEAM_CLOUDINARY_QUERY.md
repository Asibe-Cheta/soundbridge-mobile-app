# 📱 Mobile Team Query: Cloudinary Integration & Upload Flow

**Date:** November 29 2025  
**From:** Mobile App Development Team  
**To:** Web App Development Team  
**Subject:** Cloudinary Usage & Upload Flow Clarification  
**Priority:** 🟢 **HIGH** - Affects Upload Implementation  
**Status:** ❓ **AWAITING RESPONSE**

---

## 🚨 **ISSUE**

The mobile team was informed that **Cloudinary is used in this platform**, but the previous response (`MOBILE_UPLOAD_STORAGE_REFERENCE.md`) indicated to use **Supabase Storage directly** for all uploads.

We need clarification on:
1. **Which service is used for what?** (Cloudinary vs Supabase Storage)
2. **Upload flow** - How should the mobile app upload files?
3. **API endpoints** - Are there Cloudinary-specific endpoints we should use?

---

## ❓ **QUESTIONS**

### **1. Cloudinary vs Supabase Storage**

**Which service should the mobile app use for:**

**Images:**
- Cover artwork/album art → Cloudinary or Supabase Storage (`cover-art` bucket)?
- Profile images/avatars → Cloudinary or Supabase Storage (`profile-images` bucket)?
- Event images → Cloudinary or Supabase Storage (`event-images` bucket)?
- Post images/attachments → Cloudinary or Supabase Storage (`post-attachments` bucket)?

**Audio:**
- Audio tracks/podcasts → Cloudinary or Supabase Storage (`audio-tracks` bucket)?

**Current mobile implementation:**
- We're using Supabase Storage directly for all file types
- Based on `MOBILE_UPLOAD_STORAGE_REFERENCE.md` response

**Is this correct?** Or should we use Cloudinary for images?

---

### **2. Upload Method for Cloudinary**

**If Cloudinary is used, how should the mobile app upload files?**

**Option A:** Upload directly to Cloudinary using Cloudinary SDK?
```typescript
// Example (need confirmation)
import { cloudinary } from '@cloudinary/react-native';
await cloudinary.uploader.upload(fileUri, options);
```

**Option B:** Upload via API endpoints (e.g., `/api/upload/image` or `/api/cloudinary/upload`)?
```typescript
// Example (need confirmation)
const formData = new FormData();
formData.append('file', { uri, name, type });
const response = await fetch('/api/upload/image', {
  method: 'POST',
  body: formData
});
```

**Option C:** Upload to Supabase Storage, then backend processes and uploads to Cloudinary?

**Which approach should we use?**

---

### **3. Cloudinary Configuration**

**If Cloudinary is used, please provide:**

- **Cloud name:** (e.g., `your-cloud-name`)
- **API Key:** (for mobile app, or do we use backend endpoints?)
- **Upload Preset:** (if using unsigned uploads)
- **API Secret:** (should mobile app have this, or use backend endpoints?)

**Or should the mobile app use backend API endpoints instead of direct Cloudinary SDK?**

---

### **4. Upload API Endpoints (If Applicable)**

**If we should use API endpoints for Cloudinary uploads, please provide:**

**Image Upload:**
- Endpoint: `POST /api/upload/image` or `POST /api/cloudinary/upload`?
- Request format: FormData with field name `file` or `image`?
- Response format: `{ success: true, data: { url: "...", public_id: "..." } }`?

**Audio Upload:**
- Endpoint: `POST /api/upload/audio` or `POST /api/cloudinary/upload-audio`?
- Request format: FormData with field name `file` or `audio`?
- Response format: `{ success: true, data: { url: "...", ... } }`?

**Track Creation:**
- Endpoint: `POST /api/tracks` or `POST /api/audio-tracks`?
- Should we include Cloudinary URLs in the request body?

---

### **5. File URL Format**

**What URL format should we expect from Cloudinary uploads?**

**Example formats:**
- `https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.jpg`
- `https://res.cloudinary.com/{cloud_name}/video/upload/{public_id}.mp3`
- Other format?

**Should we store the full Cloudinary URL in the database, or just the `public_id`?**

---

### **6. Upload Flow Summary**

**Please clarify the complete upload flow:**

**For Images (Cover Art, Profile, Events, Posts):**
1. Mobile app uploads to → **Cloudinary** or **Supabase Storage**?
2. Backend processes → **Yes/No**? (e.g., resizing, optimization)
3. URL stored in database → **Full URL** or **public_id**?

**For Audio (Tracks/Podcasts):**
1. Mobile app uploads to → **Cloudinary** or **Supabase Storage**?
2. Backend processes → **Yes/No**? (e.g., transcoding, metadata extraction)
3. URL stored in database → **Full URL** or **public_id**?

---

### **7. Current Implementation Status**

**Current mobile implementation:**
- ✅ Using Supabase Storage directly for all file types
- ✅ Using bucket names: `audio-tracks`, `cover-art`, `profile-images`, `event-images`
- ✅ File path format: `${userId}/${timestamp}_${filename}`
- ✅ Direct Supabase client uploads (no API endpoints)

**Is this correct?** Or should we:
- Use Cloudinary for images?
- Use API endpoints instead of direct storage uploads?
- Use a different upload flow?

---

## 📋 **WHAT WE NEED**

1. **Clarification on Cloudinary usage** - Which files go to Cloudinary vs Supabase Storage?
2. **Upload method** - Direct Cloudinary SDK, API endpoints, or Supabase Storage?
3. **Configuration details** - Cloud name, API keys, upload presets (if applicable)
4. **API endpoint details** - If using API endpoints for Cloudinary uploads
5. **URL format** - What format to expect and store in database
6. **Complete upload flow** - Step-by-step process for images and audio

---

## ⚠️ **CURRENT SITUATION**

**Mobile app is currently:**
- Uploading all files directly to Supabase Storage
- Using bucket names as specified in `MOBILE_UPLOAD_STORAGE_REFERENCE.md`
- Creating database records with Supabase Storage URLs

**If Cloudinary is used, we need to:**
- Update upload service to use Cloudinary (or API endpoints)
- Adjust URL storage format
- Update upload flow accordingly

---

## 📝 **ADDITIONAL CONTEXT**

- Mobile app is using React Native with Expo
- Currently using `@supabase/supabase-js` for Supabase Storage uploads
- Files are selected using `expo-document-picker` and `expo-image-picker`
- Ready to integrate Cloudinary SDK if needed

---

## ✅ **NEXT STEPS**

Once we receive this information, we will:
1. Update `UploadService.ts` to use the correct service (Cloudinary or Supabase Storage)
2. Adjust upload method if API endpoints are preferred
3. Update URL storage format if needed
4. Test upload functionality end-to-end
5. Confirm everything works with your backend

---

**Thank you for your assistance!** 🙏

Please clarify the Cloudinary integration and upload flow so we can complete the upload functionality correctly.

