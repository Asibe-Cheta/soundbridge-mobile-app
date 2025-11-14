# 🔐 Mobile Team: Authentication Issue - Request for Web Team Assistance

**Date:** November 13, 2025  
**Priority:** 🚨 **HIGH - Blocking User Preferences & Upload Quota Features**  
**Status:** Awaiting Web Team Response  
**From:** Mobile App Development Team

---

## 🚨 **ISSUE SUMMARY**

The mobile app is experiencing persistent **401 "Authentication required"** errors when calling certain API endpoints, even though:
- ✅ Bearer token is present and valid (length: 878 characters)
- ✅ Supabase session exists and is active
- ✅ Both Bearer token AND Cookie headers are being sent
- ✅ Token format appears correct (JWT starting with `eyJhbGci...`)

### **Affected Endpoints:**
1. `GET /api/users/{userId}/preferences` ❌ Returns 401
2. `GET /api/upload/quota` ❌ Returns 401

---

## 📋 **CURRENT IMPLEMENTATION**

### **Authentication Headers Being Sent:**

```typescript
// From apiClient.ts
Headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...',
  'Cookie': 'sb-access-token=eyJhbGciOiJIUzI1NiIs...; sb-refresh-token=...',
  'Content-Type': 'application/json'
}
```

### **Cookie Format:**
```typescript
// Current Cookie format
sb-access-token={access_token}; sb-refresh-token={refresh_token}
```

### **Console Logs Show:**
```
🍪 Using Cookie authentication + Bearer token
🍪 Cookie header: sb-access-token=eyJhbGciOiJIUzI1NiIsImtpZCI6Im9yZX...
🔑 Has token: true
📦 Has session: true
🔐 Token length: 878
📡 API Response: 401
❌ API Error (401): {error: 'Authentication required'}
```

---

## ❓ **QUESTIONS FOR WEB TEAM**

### **1. Cookie Format Verification**

**Question:** What is the exact Cookie format that the backend expects?

**Current Format:**
```
sb-access-token={access_token}; sb-refresh-token={refresh_token}
```

**Options to verify:**
- [ ] Is `sb-access-token` the correct cookie name?
- [ ] Should it be `sb-access-token` or something else (e.g., `sb-{project-ref}-auth-token`)?
- [ ] Is the semicolon-separated format correct?
- [ ] Should refresh token be included, or only access token?

**Example of what we're sending:**
```
Cookie: sb-access-token=eyJhbGciOiJIUzI1NiIsImtpZCI6Im9yZX...; sb-refresh-token=...
```

---

### **2. Endpoint Authentication Requirements**

**Question:** Do these endpoints support Bearer token authentication, Cookie authentication, or both?

**Endpoints in question:**
- `GET /api/users/{userId}/preferences`
- `GET /api/upload/quota`

**Current behavior:**
- Sending both Bearer token (`Authorization: Bearer {token}`) AND Cookie (`Cookie: sb-access-token=...`)
- Still receiving 401 "Authentication required"

**What we need to know:**
- [ ] Should these endpoints work with Bearer token only?
- [ ] Should these endpoints work with Cookie only?
- [ ] Should these endpoints work with both?
- [ ] Are these endpoints supposed to require Cookie authentication specifically?

---

### **3. Token Validation**

**Question:** How does the backend validate tokens?

**What we're seeing:**
- Token is present and appears valid (JWT format, correct length)
- Session exists in Supabase client
- `supabase.auth.getSession()` returns a valid session
- But backend still rejects with 401

**What we need to know:**
- [ ] Does the backend validate tokens by calling `supabase.auth.getUser(token)`?
- [ ] Is there any token expiration check that might be failing?
- [ ] Are there any additional token validation steps we should be aware of?
- [ ] Could there be a time sync issue causing token validation to fail?

---

### **4. Cookie Authentication Implementation**

**Question:** How does the backend extract and validate Cookie-based authentication?

**Current implementation on backend (from previous docs):**
```typescript
// From web team docs - getSupabaseRouteClient()
// Checks headers in order:
1. Authorization: Bearer {token}
2. authorization: Bearer {token} (lowercase)
3. X-Authorization: Bearer {token}
4. X-Auth-Token: {token}
5. X-Supabase-Token: {token}
```

**What we need to know:**
- [ ] Does the backend also check Cookie headers?
- [ ] If yes, what Cookie names does it look for?
- [ ] How does it extract the token from the Cookie?
- [ ] Is there a specific Cookie format required?

---

### **5. Session Refresh**

**Question:** Should the mobile app refresh the session before making these API calls?

**Current behavior:**
- Mobile app calls `supabase.auth.getSession()` before API calls
- Supabase client has `autoRefreshToken: true` configured
- Still getting 401 errors

**What we need to know:**
- [ ] Should we manually refresh tokens before API calls?
- [ ] Is there a token expiration issue we should be aware of?
- [ ] Should we call `supabase.auth.refreshSession()` explicitly?

---

### **6. Endpoint-Specific Requirements**

**Question:** Are there any endpoint-specific authentication requirements?

**For `/api/users/{userId}/preferences`:**
- [ ] Does this endpoint require the authenticated user to match `userId`?
- [ ] Are there any RLS policies that might be blocking access?
- [ ] Does this endpoint require Cookie authentication specifically?

**For `/api/upload/quota`:**
- [ ] Does this endpoint require Cookie authentication?
- [ ] Are there any special permissions needed?
- [ ] Is this endpoint protected by RLS policies?

---

### **7. Testing & Debugging**

**Question:** How can we debug this authentication issue?

**What we've tried:**
- ✅ Sending Bearer token only
- ✅ Sending Cookie only
- ✅ Sending both Bearer token and Cookie
- ✅ Refreshing session before API calls
- ✅ Verifying token format and length

**What we need:**
- [ ] Can you provide example request headers that work?
- [ ] Can you check backend logs to see what headers are being received?
- [ ] Can you verify if tokens are being validated correctly?
- [ ] Are there any backend-side logs we should check?

---

## 🔍 **DEBUGGING INFORMATION**

### **Request Details:**
```http
GET https://www.soundbridge.live/api/users/bd8a455d-a54d-45c5-968d-e4cf5e8d928e/preferences
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Cookie: sb-access-token=eyJhbGciOiJIUzI1NiIs...; sb-refresh-token=...
Content-Type: application/json
```

### **Response:**
```json
{
  "error": "Authentication required"
}
```

**Status Code:** 401 Unauthorized

### **Token Information:**
- **Token Length:** 878 characters
- **Token Format:** JWT (starts with `eyJhbGci...`)
- **Token Source:** Supabase session (`session.access_token`)
- **Session Status:** Active (verified via `supabase.auth.getSession()`)

---

## 💡 **SUGGESTED SOLUTIONS**

### **Option 1: Cookie Format Fix**
If the Cookie format is wrong, please provide the correct format:
```typescript
// Example of what we need
Cookie: correct-cookie-name=token-value
```

### **Option 2: Bearer Token Only**
If these endpoints should work with Bearer token only, we can remove Cookie authentication:
```typescript
// Remove Cookie, use only Bearer token
Authorization: Bearer {token}
```

### **Option 3: Different Cookie Names**
If Cookie names are different, please specify:
```typescript
// Example
Cookie: sb-{project-ref}-auth-token={token}
```

### **Option 4: Additional Headers**
If additional headers are needed:
```typescript
// Example
X-Supabase-Project-Ref: {project-ref}
X-Supabase-Access-Token: {token}
```

---

## 📝 **NEXT STEPS**

1. **Web Team:** Please review this document and provide answers to the questions above
2. **Mobile Team:** Will implement fixes based on web team's response
3. **Testing:** Both teams will verify the fix works correctly

---

## 🔗 **RELATED DOCUMENTATION**

- Previous web team response: `WEB_TEAM_SERVICE_PROVIDER_AUTH_FIX.md`
- Service Provider API docs: `SERVICE_PROVIDER_IMPLEMENTATION_DOCUMENTATION.md`
- API Client implementation: `src/lib/apiClient.ts`

---

## 📧 **CONTACT**

**Mobile Team Contact:**
- Please respond to this document with answers to the questions above
- If you need additional debugging information, please let us know

**Status:** ⏳ **Awaiting Web Team Response**

---

**Last Updated:** November 13, 2025

