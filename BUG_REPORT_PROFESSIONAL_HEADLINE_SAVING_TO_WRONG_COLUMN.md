# 🔴 BUG REPORT: Professional Headline Saving to Wrong Database Column

**Date:** January 2, 2026
**Reported by:** Mobile Team
**Severity:** High
**Status:** Needs Web Team Fix

---

## 🐛 Problem Summary

The web app's profile edit form is saving the "Professional Headline" input to the **`bio`** column instead of the **`professional_headline`** column in the `profiles` table.

---

## 📊 Evidence

### User Input (Web App Profile Edit Screen)
- **Professional Headline Field:** `Vocalist`
- **Bio Field:** `An experienced tenor singer with various successes in the world of music.`

### Actual Database Values (After Saving)
```sql
SELECT username, professional_headline, bio
FROM profiles
WHERE username = 'asibe_chetajwbejeb';
```

**Result:**
```json
{
  "username": "asibe_chetajwbejeb",
  "professional_headline": "An experienced tenor singer with various successes in the world of music.",
  "bio": "An experienced tenor singer with various successes in the world of music."
}
```

### Expected Database Values
```json
{
  "username": "asibe_chetajwbejeb",
  "professional_headline": "Vocalist",
  "bio": "An experienced tenor singer with various successes in the world of music."
}
```

---

## 🔍 Root Cause

The web app's profile edit form is likely:
1. Saving the "Professional Headline" input value to the `bio` column
2. Saving the "Bio" input value to the `professional_headline` column

**OR**

The form fields are **swapped** in the backend update mutation/API endpoint.

---

## 🎯 Required Fix

### Web App Backend/Frontend Changes Needed:

1. **Check Profile Edit Form Handler**
   - Ensure "Professional Headline" input saves to `profiles.professional_headline`
   - Ensure "Bio" input saves to `profiles.bio`

2. **Verify API Endpoint**
   - Check the profile update endpoint (likely `PUT /api/profiles` or similar)
   - Ensure field mapping is correct:
     ```typescript
     {
       professional_headline: formData.professionalHeadline, // NOT formData.bio
       bio: formData.bio // NOT formData.professionalHeadline
     }
     ```

3. **Test After Fix**
   - Edit profile with:
     - Professional Headline: "Vocalist"
     - Bio: "An experienced tenor singer..."
   - Verify database shows:
     - `professional_headline` = "Vocalist"
     - `bio` = "An experienced tenor singer..."

---

## 📱 Impact on Mobile App

Until this is fixed:
- ❌ Mobile app shows incorrect data in feeds (bio text appears instead of professional headline)
- ❌ Users see their bio duplicated on posts
- ❌ Professional headline doesn't display correctly

---

## ✅ Verification Steps (After Web Team Fix)

1. **Clear existing data:**
   ```sql
   UPDATE profiles
   SET professional_headline = NULL, bio = NULL
   WHERE username = 'asibe_chetajwbejeb';
   ```

2. **Edit profile on web app:**
   - Set Professional Headline: "Vocalist"
   - Set Bio: "An experienced tenor singer with various successes in the world of music."
   - Save

3. **Verify in database:**
   ```sql
   SELECT username, professional_headline, bio
   FROM profiles
   WHERE username = 'asibe_chetajwbejeb';
   ```

4. **Expected Result:**
   ```json
   {
     "username": "asibe_chetajwbejeb",
     "professional_headline": "Vocalist",
     "bio": "An experienced tenor singer with various successes in the world of music."
   }
   ```

5. **Check mobile app feed:**
   - Should show "Vocalist" under the user's name
   - Should NOT show bio text duplicated

---

## 📝 Additional Notes

- The `profiles` table schema is correct - both columns exist
- The mobile app is correctly querying and displaying the data
- This is purely a web app data-saving issue
- No changes needed on mobile app side once web team fixes this

---

## 🔗 Related Files

- Profile Edit Screen: (Web app codebase - location unknown to mobile team)
- Profile Update API: (Web app codebase - location unknown to mobile team)
- Database Table: `profiles` (columns: `professional_headline`, `bio`)

---

**Please fix this issue so professional headlines save correctly!**
