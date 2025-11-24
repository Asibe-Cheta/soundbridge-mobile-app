# 🔴 Database Migration Required - Action Needed

## Summary

The web team has implemented the `/api/auth/login-initiate` endpoint, but **you need to run a database migration** before it will work.

## ⚠️ CRITICAL: Run This Migration

**Go to Supabase Dashboard → SQL Editor → Run this:**

```sql
-- Add email and password_hash columns to two_factor_verification_sessions table
ALTER TABLE two_factor_verification_sessions
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE two_factor_verification_sessions
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_2fa_sessions_email ON two_factor_verification_sessions(email);
```

## Why This Is Needed

The new secure login flow stores encrypted credentials temporarily in the `two_factor_verification_sessions` table:
- `email` - User email for re-authentication
- `password_hash` - Encrypted password (AES-256-GCM) for re-authentication

These columns are required for the `/api/auth/login-initiate` endpoint to work.

## What Happens If You Don't Run It

The endpoint will fail with a database error when trying to insert verification sessions.

## After Running Migration

1. ✅ The endpoint will work correctly
2. ✅ No brief app flash will occur
3. ✅ Secure login flow will be active

## Status

- ✅ Mobile app code updated and ready
- ✅ Backend endpoint implemented
- ⏳ **Database migration needs to be run** ← YOU ARE HERE
- ⏳ Ready for testing after migration

