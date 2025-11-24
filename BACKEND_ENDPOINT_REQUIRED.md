# 🔴 Backend Endpoint Required - Secure Login Flow

## Summary

The mobile app has been updated to use Claude's secure login flow that prevents the brief app flash. However, **the backend endpoint `/api/auth/login-initiate` needs to be created** by the web team.

## Required Backend Endpoint

### **POST /api/auth/login-initiate**

**Purpose:** Validates credentials and checks 2FA requirement **BEFORE** creating a session, preventing the brief MainTabs flash.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response (2FA Required):**
```json
{
  "success": true,
  "requires2FA": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "verificationSessionId": "temporary-session-uuid"
  }
}
```

**Response (No 2FA):**
```json
{
  "success": true,
  "requires2FA": false,
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "user": { ... }
  }
}
```

**Response (Invalid Credentials):**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

## Implementation Details

See Claude's solution in `2FA_BRIEF_APP_FLASH_ISSUE_FOR_CLAUDE.md` for the complete backend implementation.

### Key Points:

1. **Validate credentials first** using Supabase Auth (doesn't create session)
2. **Sign out immediately** after validation to not leave a session
3. **Check 2FA requirement** from database
4. **If 2FA required:** Create temporary verification session (5-minute expiry)
5. **If no 2FA:** Re-authenticate and return tokens for immediate session creation

## Database Table Required

```sql
CREATE TABLE IF NOT EXISTS two_factor_verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_2fa_sessions_user_id ON two_factor_verification_sessions(user_id);
CREATE INDEX idx_2fa_sessions_expires ON two_factor_verification_sessions(expires_at);
```

## Updated Verification Endpoints

The mobile app now sends `verificationSessionId` instead of `sessionToken`:

- `POST /api/user/2fa/verify-code` - Body: `{ verificationSessionId, code }`
- `POST /api/user/2fa/verify-backup-code` - Body: `{ verificationSessionId, backupCode }`

## Status

- ✅ Mobile app updated to use new flow
- ⏳ Backend endpoint `/api/auth/login-initiate` needs to be created
- ⏳ Database table `two_factor_verification_sessions` needs to be created
- ⏳ Verification endpoints need to accept `verificationSessionId`

## Testing

Once the backend is ready:
1. Test login with 2FA enabled - should NOT show MainTabs flash
2. Test login without 2FA - should work normally
3. Test 2FA verification - should navigate to MainTabs after verification

