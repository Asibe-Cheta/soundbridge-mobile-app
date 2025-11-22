# 🚨 2FA Lockout - Manual Reset Required - URGENT

**Date:** November 22, 2025  
**From:** Mobile Team  
**To:** Web App Team  
**Priority:** 🔴 **URGENT - USER LOCKED OUT**

---

## 🚨 **SITUATION**

**User is locked out of 2FA and cannot manage their account.**

**User Details:**
- **User ID:** `[User's Supabase UUID - check database]`
- **Email:** `asibechetachukwu@gmail.com`
- **Username:** `asibe_cheta`

---

## 🔍 **WHAT HAPPENED**

### **Current State (from mobile app):**

1. **Database says:**
   - ✅ 2FA is enabled
   - ✅ Configured: Nov 22, 2025 at 12:35 AM
   - ❌ Backup codes: 0 remaining

2. **User's reality:**
   - ❌ No SoundBridge entry in Google Authenticator app
   - ❌ Cannot generate TOTP codes
   - ❌ Has 0 backup codes
   - ❌ Cannot disable 2FA (needs TOTP code)
   - ❌ Cannot regenerate backup codes (needs TOTP code)

### **How This Happened:**

**Scenario A:** User enabled 2FA but never scanned QR code
**Scenario B:** User scanned QR code but lost/deleted the entry
**Scenario C:** User used all 10 backup codes and now has 0 remaining

**Result:** User has 2FA enabled in database but no way to generate codes.

---

## ⚠️ **IMMEDIATE PROBLEM**

**User is currently logged in**, but:

1. If they log out, they **CANNOT log back in**
   - Login requires TOTP code they don't have
   - They have 0 backup codes

2. They cannot manage 2FA:
   - Can't disable (needs TOTP code)
   - Can't regenerate backup codes (needs TOTP code)
   - Can't do anything

3. They're **stuck with 2FA enabled** until web team resets it

---

## 🔧 **WHAT WE NEED FROM WEB TEAM**

### **Option 1: Manual Database Reset (Fastest)**

**Reset the user's 2FA in the database:**

```sql
-- 1. Find user's 2FA records
SELECT 
  id, 
  user_id, 
  totp_enabled,
  created_at
FROM two_factor_secrets 
WHERE user_id = 'USER_UUID_HERE';

-- 2. DELETE the 2FA record (this disables 2FA)
DELETE FROM two_factor_secrets 
WHERE user_id = 'USER_UUID_HERE';

-- 3. DELETE backup codes
DELETE FROM two_factor_backup_codes 
WHERE user_id = 'USER_UUID_HERE';

-- 4. Verify 2FA is now disabled
SELECT * FROM two_factor_secrets WHERE user_id = 'USER_UUID_HERE';
-- Should return no rows
```

**After this:**
- ✅ User can log in without 2FA
- ✅ User can re-enable 2FA properly
- ✅ User can scan QR code this time
- ✅ User can save backup codes

---

### **Option 2: Create Recovery Flow (Long-term)**

**Add a "Lost Authenticator Device" feature:**

**Workflow:**
1. User tries to log in
2. Can't enter TOTP code
3. Taps "Lost my authenticator device"
4. Receives email with temporary link
5. Link disables 2FA after email verification
6. User can log in and re-enable 2FA

**This would prevent future lockouts.**

---

## 📊 **DATABASE QUERIES TO RUN**

### **Step 1: Find User's UUID**

```sql
SELECT 
  id, 
  email, 
  created_at
FROM auth.users 
WHERE email = 'asibechetachukwu@gmail.com';
```

**Copy the `id` (UUID) for next steps.**

---

### **Step 2: Check 2FA Status**

```sql
-- Check two_factor_secrets table
SELECT 
  id,
  user_id,
  method,
  totp_enabled,
  totp_secret IS NOT NULL as has_secret,
  created_at,
  updated_at
FROM two_factor_secrets 
WHERE user_id = 'USER_UUID_FROM_STEP_1';

-- Check backup codes
SELECT 
  id,
  user_id,
  code_hash,
  used,
  used_at,
  created_at
FROM two_factor_backup_codes 
WHERE user_id = 'USER_UUID_FROM_STEP_1'
ORDER BY created_at DESC;
```

**Expected Results:**
- `two_factor_secrets`: 1 row (totp_enabled = true)
- `two_factor_backup_codes`: 0-10 rows (all used or none exist)

---

### **Step 3: Reset 2FA**

```sql
-- Delete 2FA secret
DELETE FROM two_factor_secrets 
WHERE user_id = 'USER_UUID_FROM_STEP_1';

-- Delete backup codes
DELETE FROM two_factor_backup_codes 
WHERE user_id = 'USER_UUID_FROM_STEP_1';

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM two_factor_secrets WHERE user_id = 'USER_UUID_FROM_STEP_1') as secrets_count,
  (SELECT COUNT(*) FROM two_factor_backup_codes WHERE user_id = 'USER_UUID_FROM_STEP_1') as backup_codes_count;
```

**Expected:** Both counts should be 0

---

### **Step 4: Verify Status API**

**Test that Status API now returns `enabled: false`:**

```bash
# Get user's JWT token (user must be logged in)
# Then call status API

curl -X GET https://www.soundbridge.live/api/user/2fa/status \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "enabled": false,
  "method": null,
  "configuredAt": null,
  "backupCodesRemaining": 0
}
```

---

## 🧪 **TESTING AFTER RESET**

### **Test 1: Mobile App Status**

**User should:**
1. Pull to refresh on 2FA Settings screen
2. See: "2FA Disabled"
3. See: "Enable Two-Factor Authentication" button
4. Not see: "Disable" or "Regenerate Codes" buttons

### **Test 2: Full Re-Enable Flow**

**User should:**
1. Tap "Enable Two-Factor Authentication"
2. See QR code
3. **SCAN QR CODE** with Google Authenticator
4. See "SoundBridge" entry appear in authenticator app
5. Enter 6-digit code to verify
6. Receive 10 backup codes
7. **SAVE backup codes** (screenshot/write down)
8. 2FA now properly enabled with working TOTP

### **Test 3: Login Flow**

**User should:**
1. Log out of app
2. Log back in with email/password
3. See "2FA Required" screen
4. Open Google Authenticator
5. See SoundBridge entry with 6-digit code
6. Enter code
7. Successfully log in ✅

---

## ⚠️ **IMPORTANT NOTES**

### **Why This Happened:**

**Most likely:** User enabled 2FA at 12:35 AM but:
- Never scanned the QR code
- Or scanned it but Google Authenticator lost the entry
- Or deleted the entry by accident

### **How to Prevent This:**

1. **During Setup:**
   - ✅ Force user to verify TOTP code before completing setup
   - ✅ Don't mark 2FA as "enabled" until verification succeeds
   - ✅ Show backup codes AFTER verification (we already do this)

2. **Add Recovery Option:**
   - ✅ "Lost Authenticator Device" button on login screen
   - ✅ Email verification to disable 2FA
   - ✅ Fallback for locked-out users

3. **Warn About Low Backup Codes:**
   - ✅ Alert user when <= 2 backup codes remaining
   - ✅ Prompt to regenerate before running out
   - ✅ We already show this warning (user has 0)

---

## 📞 **USER INSTRUCTIONS AFTER RESET**

**Once web team confirms reset is complete:**

### **Step 1: Verify 2FA is Disabled**

1. Open SoundBridge app
2. Go to Profile → Two-Factor Authentication
3. **Pull down to refresh**
4. Should see: "2FA Disabled"

### **Step 2: Re-Enable 2FA Properly**

1. Tap "Enable Two-Factor Authentication"
2. **QR code will appear**
3. **CRITICAL:** Open Google Authenticator
4. **CRITICAL:** Tap the + button
5. **CRITICAL:** Tap "Scan a QR code"
6. **CRITICAL:** Scan the QR code on SoundBridge app
7. **Verify:** See "SoundBridge" appear in Google Authenticator
8. Enter the 6-digit code from Google Authenticator
9. **CRITICAL:** Save all 10 backup codes (screenshot + write down)
10. Tap "Done"

### **Step 3: Test It Works**

1. Log out of SoundBridge
2. Log back in with email/password
3. When prompted for 2FA code:
   - Open Google Authenticator
   - Find SoundBridge entry
   - Enter the 6-digit code
4. Should log in successfully ✅

---

## 🚨 **URGENCY**

**HIGH - User is currently logged in but afraid to log out**

**Timeline Needed:**
- 🚨 **Within 1 hour:** Run database reset queries
- ⚠️ **Within 2 hours:** Verify status API returns `enabled: false`
- ✅ **Within 4 hours:** User re-enables 2FA properly

**Impact if not fixed:**
- ❌ User cannot log out (will be locked out)
- ❌ User stuck on one device
- ❌ User cannot test login flow
- ❌ User afraid to close app

---

## 📊 **CURRENT STATUS**

| Component | Status | Notes |
|-----------|--------|-------|
| **2FA Database Record** | ❌ Enabled | Needs to be deleted |
| **User's Authenticator** | ❌ No entry | Cannot generate codes |
| **Backup Codes** | ❌ 0 remaining | Cannot use as fallback |
| **User Can Log In** | ⚠️ Only while session active | Will be locked out if logs out |
| **User Can Manage 2FA** | ❌ No | Needs TOTP code to disable |

---

## 💡 **RECOMMENDED ACTION**

**Fastest solution (5 minutes):**

1. **Find user's UUID** (query auth.users)
2. **Delete from two_factor_secrets** (disables 2FA)
3. **Delete from two_factor_backup_codes** (cleanup)
4. **Verify status API** returns `enabled: false`
5. **Tell user to refresh app** and re-enable properly

**This is safe because:**
- ✅ User is currently logged in (won't lose access)
- ✅ User can immediately re-enable 2FA
- ✅ This time they'll scan QR code properly
- ✅ This time they'll have backup codes

---

## 📸 **EVIDENCE**

**User's Google Authenticator app:**
- Has: AWS, asibe_cheta, Login.gov, Government Gateway
- Missing: **SoundBridge** ❌

**User's SoundBridge app:**
- Shows: "2FA Enabled" ✅
- Shows: "0 codes remaining" ⚠️
- Shows: "Configured: Nov 22, 2025 at 12:35 AM"

**Conclusion:** Database and reality are out of sync.

---

**Status:** 🔴 **URGENT - AWAITING WEB TEAM DATABASE RESET**

---

**Mobile Team**  
November 22, 2025

**P.S.** User is in Nigeria (based on government gateway entry), so they're working late night (02:59 AM their time). Please prioritize this so they can test before going to sleep!

