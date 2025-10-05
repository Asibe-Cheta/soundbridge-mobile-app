# 🔍 Stripe Verification Troubleshooting Guide

**Date:** October 1, 2025  
**Issue:** Bank account verification stuck in "Pending" status  
**User:** Justice Asibe (Barclays, GBP)  
**Status:** Added Sept 30th → Still pending Oct 1st

## 🚨 **IMMEDIATE ACTION REQUIRED**

### **1. Check Your Stripe Connect Dashboard FIRST**
This is the **most critical step**:

1. **Log into your Stripe Connect dashboard** (the account linked to SoundBridge)
2. **Navigate to:** Connect → Accounts → [Your Account]
3. **Look for:**
   - ❌ **Red alerts** or error messages
   - ❌ **Pending requirements** (ID verification, bank statements, etc.)
   - ❌ **Missing information** requests
   - ❌ **Document upload** requirements

### **2. Manual Status Check API**
I've created a new API to manually check your Stripe account status:

```typescript
// Call this API to force a status update
POST /api/stripe/check-account-status
Headers: {
  'Authorization': `Bearer ${yourToken}`,
  'Content-Type': 'application/json'
}
```

This will:
- ✅ **Check your Stripe account status** directly with Stripe
- ✅ **Update your database** with the current status
- ✅ **Return detailed status information** including any requirements

---

## 🔧 **Root Cause Analysis**

### **❌ Missing Webhook Handler (FIXED)**
**Problem:** The system wasn't receiving updates from Stripe when verification completed
**Solution:** Created `/api/stripe/webhook/route.ts` to handle Stripe webhooks

### **❌ No Manual Status Check (FIXED)**
**Problem:** No way to manually check and update account status
**Solution:** Created `/api/stripe/check-account-status/route.ts` for manual status checks

### **❌ Database Not Syncing (FIXED)**
**Problem:** Database status not updating when Stripe status changes
**Solution:** Added automatic database updates in both webhook and manual check APIs

---

## 🎯 **Step-by-Step Troubleshooting**

### **Step 1: Check Stripe Dashboard**
1. Go to [Stripe Connect Dashboard](https://dashboard.stripe.com/connect/accounts)
2. Find your account (should show your name/email)
3. Check for any **red alerts** or **pending requirements**
4. Look for **document upload** requests
5. Check if **charges are enabled** (this means verification is complete)

### **Step 2: Use Manual Status Check**
If you can't access Stripe dashboard, use the new API:

```bash
# Test the manual status check
curl -X POST https://www.soundbridge.live/api/stripe/check-account-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### **Step 3: Check Database Status**
The API will return:
```json
{
  "success": true,
  "accountStatus": {
    "chargesEnabled": true/false,
    "payoutsEnabled": true/false,
    "detailsSubmitted": true/false,
    "verificationStatus": "verified/pending",
    "requirements": {
      "currently_due": [...],
      "eventually_due": [...],
      "past_due": [...]
    }
  }
}
```

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: Stripe Requires Additional Documents**
**Symptoms:** Account shows "pending" in Stripe dashboard
**Solution:** 
- Upload requested documents (ID, bank statements, etc.)
- Complete any missing information
- Wait 1-2 business days for processing

### **Issue 2: Stripe Account Not Fully Set Up**
**Symptoms:** `charges_enabled: false` in API response
**Solution:**
- Complete all required fields in Stripe Connect onboarding
- Ensure all business information is accurate
- Verify bank account details are correct

### **Issue 3: Webhook Not Configured**
**Symptoms:** Status never updates automatically
**Solution:** 
- Configure Stripe webhook endpoint: `https://www.soundbridge.live/api/stripe/webhook`
- Enable events: `account.updated`, `account.application.deauthorized`
- Use webhook secret: `STRIPE_WEBHOOK_SECRET`

### **Issue 4: Database Out of Sync**
**Symptoms:** Stripe shows verified but SoundBridge shows pending
**Solution:**
- Use the manual status check API to force sync
- Check database logs for update errors

---

## 🔧 **Technical Implementation**

### **✅ Webhook Handler Created**
```typescript
// apps/web/app/api/stripe/webhook/route.ts
// Handles: account.updated, account.application.deauthorized
// Updates: creator_bank_accounts table with current status
```

### **✅ Manual Status Check Created**
```typescript
// apps/web/app/api/stripe/check-account-status/route.ts
// Checks: Stripe account status directly
// Updates: Database with current verification status
```

### **✅ Database Updates**
- **verification_status:** 'pending' → 'verified' when charges_enabled: true
- **is_verified:** false → true when charges_enabled: true
- **updated_at:** Timestamp of last status update

---

## 📋 **Action Items**

### **✅ For You (Immediate):**
1. **Check Stripe Connect dashboard** for any alerts or requirements
2. **Use the manual status check API** to force a status update
3. **Report back** what you find in Stripe dashboard

### **✅ For Web App Team:**
1. **Configure Stripe webhook** endpoint in Stripe dashboard
2. **Set up webhook secret** in environment variables
3. **Test webhook** with Stripe CLI or dashboard events

### **✅ For Database:**
1. **Run the manual status check** to sync current status
2. **Monitor webhook logs** for automatic updates
3. **Verify database updates** are working correctly

---

## 🎯 **Expected Timeline**

### **Normal Processing:**
- **UK banks:** 1-2 business days
- **Stripe verification:** 24-48 hours
- **Database sync:** Immediate (with webhook) or manual (with API)

### **Your Timeline:**
- **Added:** Sept 30th
- **Current:** Oct 1st (1 day)
- **Expected completion:** Oct 2nd-3rd (if no issues)

---

## 🚨 **If Still Pending After 48 Hours**

### **Check These:**
1. **Stripe dashboard** - Any error messages?
2. **Manual status check** - What does the API return?
3. **Database logs** - Any update errors?
4. **Webhook logs** - Are webhooks being received?

### **Next Steps:**
1. **Contact Stripe support** if dashboard shows issues
2. **Check server logs** for any error messages
3. **Verify webhook configuration** is working
4. **Consider manual database update** if Stripe shows verified

---

**Status:** 🔍 **TROUBLESHOOTING IN PROGRESS**  
**Priority:** 🚨 **HIGH**  
**Next Action:** **Check Stripe Dashboard + Use Manual Status Check API**

The most likely cause is that Stripe is still processing your verification or requires additional information. Check your Stripe Connect dashboard first, then use the manual status check API to force a database update.
