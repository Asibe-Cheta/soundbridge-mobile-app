# Wise API Setup Guide - SoundBridge Mobile App

**Date:** 2025-12-29
**Status:** 🟢 Ready for Production
**Environment:** LIVE (Production)

---

## Overview

This guide walks you through setting up Wise API integration for global creator payouts in the SoundBridge mobile app.

**What You'll Set Up:**
- Wise API credentials (LIVE/Production)
- Environment variables
- Webhook secret for security
- Configuration validation

---

## Prerequisites

Before starting, ensure you have:

1. ✅ **Wise Business Account**
   - Sign up at: [wise.com/business](https://wise.com/business)
   - Complete business verification
   - Add funds to your Wise balance (for payouts)

2. ✅ **Backend Team Confirmation**
   - Webhook URL created: `https://yourdomain.com/api/wise/webhook`
   - Database tables created (see SQL prompts)
   - Most environment variables set on backend

3. ✅ **Access to Production Credentials**
   - This guide uses LIVE credentials (not sandbox)
   - Handle with care - real transfers will be made!

---

## Step 1: Get Wise API Token (LIVE)

### 1.1 Navigate to API Tokens Page
1. Log in to your Wise business account
2. Go to: [wise.com/settings/api-tokens](https://wise.com/settings/api-tokens)
3. Click **"Create API token"**

### 1.2 Configure Token
- **Token name:** `SoundBridge Production API`
- **Environment:** **LIVE** (Production)
- **Scopes required:**
  - ✅ `transfers.read` - Read transfer information
  - ✅ `transfers.write` - Create and manage transfers
  - ✅ `balances.read` - Check account balance
  - ✅ `profiles.read` - Get profile information
  - ✅ `quotes.read` - Get transfer quotes
  - ✅ `quotes.write` - Create transfer quotes

### 1.3 Save Token Securely
- Click **"Create token"**
- **IMPORTANT:** Copy the token immediately - you won't see it again!
- Format: `9e0fac28-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (UUID)
- Store in password manager temporarily

---

## Step 2: Get Wise Profile ID

### 2.1 Find Your Profile ID
1. Go to: [wise.com/settings/profiles](https://wise.com/settings/profiles)
2. Select your **Business Profile**
3. The URL will look like: `https://wise.com/user/12345678`
4. Your Profile ID is the number: `12345678`

**Alternative Method (via API):**
```bash
curl https://api.wise.com/v1/profiles \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Response will include: { "id": 12345678, "type": "business", ... }
```

---

## Step 3: Generate Webhook Secret

The webhook secret is used to verify that webhook requests are actually from Wise.

### 3.1 Generate a Secure Random String

**Option A: Using OpenSSL (Mac/Linux)**
```bash
openssl rand -hex 32
```

**Option B: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option C: Using Online Generator**
- Visit: [randomkeygen.com](https://randomkeygen.com/)
- Use "CodeIgniter Encryption Keys" (256-bit)

**Example Output:**
```
a7f3c9e1b4d2f8a6c3e7b9d1f4a8c2e6b5d9f3a7c1e8b4d2f6a9c3e7b1d5f8a2
```

### 3.2 Save Webhook Secret
- Copy the generated 64-character hex string
- Store securely (you'll add it to `.env.local` next)

---

## Step 4: Create .env.local File

### 4.1 Copy Example File
```bash
cd /Users/justicechetachukwuasibe/Desktop/soundbridge-mobile-app
cp .env.example .env.local
```

### 4.2 Fill in Wise Credentials

Edit `.env.local` and replace placeholder values:

```bash
# ==============================================================================
# WISE API CONFIGURATION (Production/Live)
# ==============================================================================

# Wise API Token (from Step 1)
WISE_API_TOKEN=9e0fac28-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Wise Environment (PRODUCTION)
WISE_ENVIRONMENT=live

# Wise API Base URL (PRODUCTION)
WISE_API_URL=https://api.wise.com

# Wise Webhook Secret (from Step 3)
WISE_WEBHOOK_SECRET=a7f3c9e1b4d2f8a6c3e7b9d1f4a8c2e6b5d9f3a7c1e8b4d2f6a9c3e7b1d5f8a2

# Wise Profile ID (from Step 2)
WISE_PROFILE_ID=12345678
```

### 4.3 Verify File Permissions

Ensure `.env.local` is not readable by others:
```bash
chmod 600 .env.local
```

---

## Step 5: Verify Configuration

### 5.1 Check .gitignore

Verify `.env.local` is in `.gitignore` (already confirmed ✅):
```bash
grep "\.env.*\.local" .gitignore
# Should output: .env*.local
```

### 5.2 Test Configuration Loading

The configuration will be validated when you import the Wise config module:

```typescript
// In any TypeScript file
import { wiseConfig, isWiseProduction } from '@/lib/wise/config';

console.log('Wise Environment:', wiseConfig.environment); // 'live'
console.log('Is Production:', isWiseProduction()); // true
console.log('API URL:', wiseConfig.apiUrl); // https://api.wise.com
```

### 5.3 Expected Console Output

When the app starts, you should see:
```
💳 Wise API Configuration Loaded: {
  environment: 'live',
  apiUrl: 'https://api.wise.com',
  profileId: '12345678',
  apiTokenSet: true,
  webhookSecretSet: true
}
⚠️  WARNING: Wise is configured in PRODUCTION (live) mode!
   All transfers will be REAL and IRREVERSIBLE.
   Make sure you intend to use production credentials.
```

---

## Step 6: Share Webhook Secret with Backend Team

The backend team needs the webhook secret to verify incoming webhooks from Wise.

### 6.1 Securely Share the Secret

**DO NOT:**
- ❌ Send via email
- ❌ Post in Slack/Teams
- ❌ Commit to Git

**DO:**
- ✅ Use password manager (1Password, LastPass, etc.)
- ✅ Use encrypted messaging (Signal, etc.)
- ✅ Share in person if possible

### 6.2 Backend Configuration

The backend team should add to their `.env`:
```bash
WISE_WEBHOOK_SECRET=<same_secret_as_mobile_app>
```

This allows them to verify webhook signatures:
```typescript
// Backend webhook handler
const signature = req.headers['x-signature'];
const payload = JSON.stringify(req.body);
const expectedSignature = crypto
  .createHmac('sha256', process.env.WISE_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

---

## Step 7: Configure Wise Webhooks

The backend team should have already created the webhook URL, but you need to verify it's configured in Wise.

### 7.1 Set Up Webhook in Wise Dashboard

1. Go to: [wise.com/settings/webhooks](https://wise.com/settings/webhooks)
2. Click **"Create webhook"**
3. Configure:
   - **Name:** `SoundBridge Production Webhooks`
   - **URL:** `https://api.soundbridge.com/api/wise/webhook` (or your backend URL)
   - **Environment:** **LIVE**
   - **Events to subscribe:**
     - ✅ `transfers#state-change` - Transfer status updates
     - ✅ `transfers#active-cases` - Transfer issues/holds
     - ✅ `balances#credit` - Balance updates

4. Click **"Create"**

### 7.2 Test Webhook Delivery

Wise will send a test webhook. The backend should respond with `200 OK`.

---

## File Structure

After setup, you'll have:

```
soundbridge-mobile-app/
├── .env.example              ✅ Created (template)
├── .env.local                ✅ Created (your actual credentials)
├── .gitignore                ✅ Already includes .env*.local
├── src/
│   └── lib/
│       └── wise/
│           └── config.ts     ✅ Created (configuration module)
└── WISE_SETUP_GUIDE.md      ✅ This file
```

---

## Environment Variables Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `WISE_API_TOKEN` | ✅ Yes | `9e0fac28-xxxx...` | Wise API authentication token (UUID format) |
| `WISE_ENVIRONMENT` | ✅ Yes | `live` | Environment: `live` (production) or `sandbox` |
| `WISE_API_URL` | ✅ Yes | `https://api.wise.com` | Base URL for Wise API |
| `WISE_WEBHOOK_SECRET` | ✅ Yes | `a7f3c9e1b4d2...` | 32+ character random string for webhook verification |
| `WISE_PROFILE_ID` | ✅ Yes | `12345678` | Your Wise business profile ID (numeric) |

---

## Configuration Validation

The `src/lib/wise/config.ts` module validates all environment variables on load:

### Automatic Checks

1. ✅ **Required variables present** - Throws error if missing
2. ✅ **Environment value valid** - Must be `live` or `sandbox`
3. ✅ **API URL matches environment** - Warns if mismatched
4. ✅ **Webhook secret length** - Minimum 32 characters
5. ✅ **Profile ID format** - Must be numeric
6. ✅ **Placeholder detection** - Warns if using example values

### Error Messages

If configuration is invalid, you'll see helpful error messages:

```
Error: Missing required environment variable: WISE_API_TOKEN
Please add WISE_API_TOKEN to your .env.local file.
See .env.example for reference.
```

```
Error: Invalid WISE_ENVIRONMENT: "prod"
Must be either "live" or "sandbox".
Current value: prod
```

```
Error: WISE_WEBHOOK_SECRET is too short (16 characters).
Minimum length: 32 characters for security.
Generate a secure secret with:
  openssl rand -hex 32
```

---

## Usage Examples

### Import Configuration

```typescript
import { wiseConfig } from '@/lib/wise/config';

// Access configuration values
console.log(wiseConfig.apiToken);     // Your API token
console.log(wiseConfig.environment);  // 'live'
console.log(wiseConfig.apiUrl);       // 'https://api.wise.com'
```

### Make API Requests

```typescript
import { getWiseHeaders, getWiseEndpoint } from '@/lib/wise/config';

const response = await fetch(getWiseEndpoint('/v1/profiles'), {
  method: 'GET',
  headers: getWiseHeaders(),
});

const profiles = await response.json();
```

### Check Environment

```typescript
import { isWiseProduction, isWiseSandbox } from '@/lib/wise/config';

if (isWiseProduction()) {
  console.log('⚠️  Using LIVE Wise API - real transfers!');
}

if (isWiseSandbox()) {
  console.log('🧪 Using Sandbox Wise API - test transfers');
}
```

---

## Security Best Practices

### 1. Never Commit Secrets
- ✅ `.env.local` is in `.gitignore`
- ❌ Never commit API tokens to Git
- ❌ Never share secrets in public channels

### 2. Rotate Tokens Regularly
- Rotate API tokens every 90 days
- Immediately rotate if token is compromised
- Keep old token active during rotation

### 3. Use Minimum Required Scopes
- Only request scopes you actually need
- Review scopes quarterly
- Revoke unused tokens

### 4. Monitor API Usage
- Check Wise dashboard for unexpected activity
- Set up alerts for large transfers
- Review transfer logs weekly

### 5. Secure Webhook Endpoint
- Backend must verify webhook signatures
- Use HTTPS only (no HTTP)
- Rate limit webhook endpoint

---

## Troubleshooting

### Issue: "Missing required environment variable"

**Solution:** Ensure `.env.local` exists and contains all required variables.
```bash
# Verify file exists
ls -la .env.local

# Check if variables are set
grep WISE_ .env.local
```

### Issue: "Invalid WISE_ENVIRONMENT"

**Solution:** Ensure value is exactly `live` or `sandbox` (lowercase).
```bash
# Correct
WISE_ENVIRONMENT=live

# Incorrect
WISE_ENVIRONMENT=Live
WISE_ENVIRONMENT=LIVE
WISE_ENVIRONMENT=production
```

### Issue: "API URL doesn't match environment"

**Solution:** Ensure URL matches environment:
```bash
# Production
WISE_ENVIRONMENT=live
WISE_API_URL=https://api.wise.com

# Sandbox
WISE_ENVIRONMENT=sandbox
WISE_API_URL=https://api.sandbox.transferwise.tech
```

### Issue: "Webhook secret too short"

**Solution:** Generate a proper 32+ character secret:
```bash
openssl rand -hex 32
```

### Issue: "Profile ID should be numeric"

**Solution:** Use only the numeric ID, not the full URL:
```bash
# Correct
WISE_PROFILE_ID=12345678

# Incorrect
WISE_PROFILE_ID=https://wise.com/user/12345678
WISE_PROFILE_ID=business-12345678
```

---

## Next Steps

After completing this setup:

1. ✅ **Test Configuration** - Verify all variables load correctly
2. 🔜 **Implement Wise Service** - Create service for Wise API calls (next prompt)
3. 🔜 **Add Transfer Functionality** - Implement payout creation
4. 🔜 **Handle Webhooks** - Process transfer status updates
5. 🔜 **Update UI** - Add Wise withdrawal option to app

---

## Support

### Wise Documentation
- [API Reference](https://docs.wise.com/api-docs/api-reference/transfer)
- [Authentication Guide](https://docs.wise.com/api-docs/guides/authentication)
- [Webhooks Guide](https://docs.wise.com/api-docs/guides/webhooks)

### Internal Support
- Backend Team: For webhook and database questions
- Mobile Team: For mobile app integration
- DevOps Team: For environment variable management

---

## Checklist

Before moving to the next prompt, verify:

- [ ] ✅ Wise business account created and verified
- [ ] ✅ API token generated (LIVE environment)
- [ ] ✅ Profile ID obtained
- [ ] ✅ Webhook secret generated (32+ characters)
- [ ] ✅ `.env.local` created with all variables
- [ ] ✅ `.env.local` is in `.gitignore`
- [ ] ✅ Configuration loads without errors
- [ ] ✅ Webhook secret shared securely with backend team
- [ ] ✅ Webhook configured in Wise dashboard (by backend team)

---

**Status:** ✅ Setup Complete - Ready for Next Prompt

**Last Updated:** 2025-12-29

---

**END OF SETUP GUIDE**
