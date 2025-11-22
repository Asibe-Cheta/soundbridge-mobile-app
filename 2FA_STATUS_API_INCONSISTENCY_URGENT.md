# 🚨 2FA Status API Inconsistency - URGENT

**Date:** November 22, 2025  
**From:** Mobile Team  
**To:** Web App Team  
**Priority:** 🔴 **HIGH**  
**Status:** ❌ **BLOCKING 2FA FEATURE**

---

## 🐛 **THE ISSUE**

Two different 2FA API endpoints are returning **conflicting information** about the same user's 2FA status.

### **Conflicting Responses:**

| Endpoint | Response | Status |
|----------|----------|--------|
| `POST /api/user/2fa/setup-totp` | "2FA is already enabled" | ✅ Correct |
| `GET /api/user/2fa/status` | `{ enabled: false }` | ❌ Incorrect |

---

## 📱 **USER EXPERIENCE (BROKEN)**

### **What User Sees:**

1. **Settings Screen:**
   - Shows: "2FA Disabled"
   - Button: "Enable Two-Factor Authentication"

2. **User taps "Enable":**
   - Gets error: "2FA Already Enabled"
   - Alert: "Go to 2FA Settings to manage it"

3. **User taps "Go to Settings":**
   - Returns to same screen showing "2FA Disabled"
   - **LOOP!** Cannot manage 2FA

### **Expected Behavior:**

1. If 2FA is enabled → Show "2FA Enabled" with:
   - ✅ Status details
   - ✅ Configured date
   - ✅ Last used
   - ✅ Backup codes remaining
   - ✅ "Disable 2FA" button
   - ✅ "Regenerate Backup Codes" button

2. If 2FA is disabled → Show "2FA Disabled" with:
   - ✅ Benefits list
   - ✅ "Enable 2FA" button

---

## 🔍 **ROOT CAUSE**

The **Status API** (`/api/user/2fa/status`) is returning incorrect data.

**Possible Causes:**

1. **Database Query Issue:**
   - Status check might be querying wrong table/column
   - Not finding the user's 2FA record

2. **Decryption Error:**
   - Status check tries to decrypt TOTP secret
   - If decryption fails, it assumes 2FA is disabled
   - But setup check sees the encrypted record exists

3. **Response Format Issue:**
   - Status API returns data in unexpected format
   - Mobile app can't parse it correctly

4. **RLS Policy Issue:**
   - User can INSERT 2FA records (setup works)
   - But can't SELECT their own record (status fails)

---

## 🧪 **HOW TO REPRODUCE**

### **Test User:**
- User ID: `[User's Supabase UUID]`
- This user has 2FA enabled (confirmed by setup endpoint)

### **Steps:**

1. **Call Status API:**
   ```bash
   curl -X GET https://www.soundbridge.live/api/user/2fa/status \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
   
   **Expected:** `{ enabled: true, ... }`  
   **Actual:** `{ enabled: false }` or error

2. **Call Setup API:**
   ```bash
   curl -X POST https://www.soundbridge.live/api/user/2fa/setup-totp \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
   
   **Expected:** Error "2FA already enabled"  
   **Actual:** ✅ Returns this error (proving 2FA IS enabled)

---

## 🔧 **WHAT TO CHECK**

### **1. Status API Implementation**

**File:** `apps/web/app/api/user/2fa/status/route.ts`

**Check:**
```typescript
// Is this query correct?
const { data, error } = await supabase
  .from('user_2fa_settings')  // Correct table?
  .select('*')
  .eq('user_id', user.id)
  .single();

// Is decryption handled correctly?
if (data?.totp_secret) {
  const decrypted = decrypt(data.totp_secret);
  // Does this throw and cause enabled: false?
}
```

### **2. Database Check**

**Run this query:**
```sql
-- Check if user has 2FA record
SELECT 
  user_id,
  totp_enabled,
  totp_secret IS NOT NULL as has_secret,
  created_at
FROM user_2fa_settings
WHERE user_id = 'USER_UUID_HERE';
```

**Expected:** Should return a row with `totp_enabled = true`

### **3. RLS Policies**

**Check:**
```sql
-- Can users SELECT their own 2FA settings?
SELECT * FROM user_2fa_settings WHERE user_id = auth.uid();
```

**Expected:** Should return user's 2FA record (not empty)

---

## ✅ **EXPECTED API RESPONSES**

### **Status API (When 2FA Enabled):**

```json
{
  "enabled": true,
  "method": "totp",
  "configuredAt": "2025-11-21T20:00:00Z",
  "lastUsedAt": "2025-11-22T01:00:00Z",
  "backupCodesRemaining": 10,
  "backupCodesExpireAt": "2026-11-21T20:00:00Z"
}
```

### **Status API (When 2FA Disabled):**

```json
{
  "enabled": false
}
```

---

## 📊 **CURRENT STATUS**

| Component | Status | Notes |
|-----------|--------|-------|
| **Setup API** | ✅ Working | Correctly detects 2FA is enabled |
| **Status API** | ❌ Broken | Incorrectly reports disabled |
| **Verify API** | ❓ Unknown | Not tested yet |
| **Disable API** | ❓ Unknown | Cannot test (status broken) |
| **Encryption Key** | ✅ Deployed | `TOTP_ENCRYPTION_KEY` added 2h ago |

---

## 🎯 **WHAT WE NEED**

### **From Web Team:**

1. ✅ **Investigate** why Status API returns `enabled: false`
2. ✅ **Check** database query in status endpoint
3. ✅ **Verify** RLS policies allow SELECT on `user_2fa_settings`
4. ✅ **Test** status endpoint with test user
5. ✅ **Fix** and deploy
6. ✅ **Confirm** fix deployed

### **From Mobile Team:**

1. ⏰ Wait for web team fix
2. 🧪 Test status API again
3. ✅ Confirm UI shows correct status
4. ✅ Test full enable/disable flow

---

## 🚨 **IMPACT**

**HIGH** - Users cannot:
- ❌ View their 2FA status
- ❌ Manage 2FA settings
- ❌ Disable 2FA (if needed)
- ❌ Regenerate backup codes
- ❌ See backup codes remaining

**Current Workaround:** NONE - Feature is completely broken

---

## 📞 **DEBUGGING INFO**

### **Mobile App Logs (When Checking Status):**

```typescript
📊 Loading 2FA status...
❌ Failed to load status: [error message here]
// OR
✅ Status loaded: { enabled: false } // ← INCORRECT
```

### **Expected Logs:**

```typescript
📊 Loading 2FA status...
✅ Status loaded: { enabled: true, configuredAt: "...", backupCodesRemaining: 10 }
```

---

## 🔗 **RELATED DOCUMENTS**

1. `WEB_TEAM_2FA_FIX_RESPONSE.md` - Encryption key fix (completed)
2. `2FA_BACKEND_ISSUE_URGENT.md` - Original encryption key issue
3. `2FA_FRONTEND_FIX_COMPLETE.md` - Mobile app fixes (completed)

---

## ⏰ **URGENCY**

**HIGH** - This is the last blocker for 2FA feature.

**Timeline:**
- 🚨 **Within 1 hour:** Investigate and identify root cause
- ⚠️ **Within 4 hours:** Deploy fix
- ✅ **Within 24 hours:** Confirm working

---

## 💡 **POSSIBLE QUICK FIXES**

If the issue is complex, consider:

1. **Return raw database data:** Don't decrypt, just return whether record exists
2. **Check setup endpoint logic:** Use same query as setup endpoint (it works!)
3. **Simplify status check:** Just check if `user_2fa_settings` record exists

---

## 📸 **SCREENSHOTS**

**User sees:**
1. Alert: "2FA Already Enabled"
2. Settings screen: Shows "2FA Disabled" ← Contradiction!

---

**Status:** 🔴 **BLOCKING - WAITING FOR WEB TEAM FIX**

---

**Mobile Team**  
November 22, 2025

**P.S.** Setup API works correctly (detects 2FA is enabled). Status API just needs to return same info!

