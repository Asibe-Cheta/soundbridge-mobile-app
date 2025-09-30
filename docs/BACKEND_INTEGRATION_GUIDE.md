# 🔗 **Backend Integration Guide for In-App Purchases**

## 📋 **Overview**
This guide explains how your SoundBridge backend should handle In-App Purchase verification and subscription management for both iOS and Android platforms.

---

## 🎯 **Current Backend Status**

### **✅ Already Implemented:**
Your web team has already created these API endpoints:

1. **`GET /api/subscriptions/products`** - Returns IAP product configurations
2. **`POST /api/subscriptions/verify-iap`** - Verifies purchase receipts and activates subscriptions

### **🔧 Mobile App Integration:**
The mobile app is configured to:
- Load product pricing from your API
- Send purchase receipts for verification
- Handle subscription activation responses

---

## 📱 **Mobile App Flow**

### **Purchase Process:**
```
1. User taps "Subscribe" → Mobile app initiates Apple/Google purchase
2. Apple/Google processes payment → Returns receipt to mobile app
3. Mobile app sends receipt → Your API endpoint for verification
4. Your API verifies receipt → With Apple/Google servers
5. Your API updates database → User subscription status
6. Your API returns success → Mobile app shows confirmation
```

---

## 🔗 **API Endpoint Details**

### **1. Product Configuration Endpoint**

**`GET /api/subscriptions/products`**

**Query Parameters:**
```
platform: "apple" | "google"
```

**Expected Response:**
```json
{
  "success": true,
  "productList": [
    {
      "id": "pro_monthly",
      "platform": "apple",
      "productId": "com.soundbridge.pro.monthly",
      "tier": "pro",
      "billingCycle": "monthly",
      "priceUsd": 9.99,
      "currency": "USD",
      "displayName": "Pro Monthly",
      "description": "Unlimited uploads and premium features"
    },
    {
      "id": "pro_yearly",
      "platform": "apple", 
      "productId": "com.soundbridge.pro.yearly",
      "tier": "pro",
      "billingCycle": "yearly",
      "priceUsd": 99.99,
      "currency": "USD",
      "displayName": "Pro Yearly",
      "description": "Unlimited uploads and premium features - Save 17%"
    }
    // ... enterprise products
  ]
}
```

### **2. Purchase Verification Endpoint**

**`POST /api/subscriptions/verify-iap`**

**Headers:**
```
Authorization: Bearer {supabase_access_token}
Content-Type: application/json
```

**iOS Request Body:**
```json
{
  "platform": "apple",
  "receiptData": "base64_encoded_receipt_data",
  "productId": "com.soundbridge.pro.monthly",
  "transactionId": "apple_transaction_id"
}
```

**Android Request Body:**
```json
{
  "platform": "google",
  "packageName": "com.soundbridge.mobile",
  "productId": "soundbridge_pro_monthly",
  "purchaseToken": "google_purchase_token",
  "transactionId": "google_order_id"
}
```

**Expected Success Response:**
```json
{
  "success": true,
  "subscription": {
    "plan": "pro",
    "status": "active",
    "billingCycle": "monthly",
    "expiresAt": "2025-10-30T09:36:00Z",
    "autoRenew": true
  },
  "profile": {
    "subscription_tier": "pro",
    "subscription_status": "active"
  },
  "message": "Subscription activated successfully"
}
```

---

## 🔧 **Backend Implementation Requirements**

### **Apple App Store Verification**

Your backend should verify iOS receipts with Apple:

```javascript
// Example Apple receipt verification
async function verifyAppleReceipt(receiptData) {
  const appleUrl = process.env.NODE_ENV === 'production' 
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';
    
  const response = await fetch(appleUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      'password': process.env.APPLE_SHARED_SECRET, // From App Store Connect
      'exclude-old-transactions': true
    })
  });
  
  const result = await response.json();
  
  if (result.status === 0) {
    // Receipt is valid - extract subscription info
    const latestReceipt = result.latest_receipt_info[0];
    return {
      isValid: true,
      productId: latestReceipt.product_id,
      transactionId: latestReceipt.transaction_id,
      expiresDate: new Date(parseInt(latestReceipt.expires_date_ms))
    };
  }
  
  return { isValid: false, error: `Apple verification failed: ${result.status}` };
}
```

### **Google Play Verification**

Your backend should verify Android purchases with Google:

```javascript
// Example Google Play verification
const { google } = require('googleapis');

async function verifyGooglePurchase(packageName, productId, purchaseToken) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'path/to/service-account.json', // Service account key
    scopes: ['https://www.googleapis.com/auth/androidpublisher']
  });
  
  const androidpublisher = google.androidpublisher({
    version: 'v3',
    auth: auth
  });
  
  try {
    const result = await androidpublisher.purchases.subscriptions.get({
      packageName: packageName,
      subscriptionId: productId,
      token: purchaseToken
    });
    
    const purchase = result.data;
    return {
      isValid: true,
      orderId: purchase.orderId,
      startTimeMillis: purchase.startTimeMillis,
      expiryTimeMillis: purchase.expiryTimeMillis,
      autoRenewing: purchase.autoRenewing
    };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}
```

---

## 🗄️ **Database Schema Updates**

### **Subscription Management Tables**

You'll need to track subscription data:

```sql
-- Subscription records
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    platform VARCHAR(10) NOT NULL, -- 'apple' or 'google'
    product_id VARCHAR(100) NOT NULL,
    transaction_id VARCHAR(200) UNIQUE,
    purchase_token TEXT, -- For Google Play
    subscription_tier VARCHAR(20) NOT NULL, -- 'pro' or 'enterprise'
    billing_cycle VARCHAR(10) NOT NULL, -- 'monthly' or 'yearly'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase receipts for auditing
CREATE TABLE purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    subscription_id UUID REFERENCES user_subscriptions(id),
    platform VARCHAR(10) NOT NULL,
    receipt_data TEXT NOT NULL,
    verification_result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update profiles table to include subscription info
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
```

---

## 🔄 **Webhook Configuration**

### **Apple Server-to-Server Notifications**

Configure webhook to receive subscription updates from Apple:

```javascript
// Handle Apple subscription notifications
app.post('/api/webhooks/apple-subscriptions', async (req, res) => {
  const notification = req.body;
  
  // Verify notification signature
  // Update subscription status in database
  // Handle events: INITIAL_BUY, CANCEL, RENEWAL, etc.
  
  res.status(200).send('OK');
});
```

### **Google Real-Time Developer Notifications**

Configure webhook for Google Play updates:

```javascript
// Handle Google Play subscription notifications  
app.post('/api/webhooks/google-play', async (req, res) => {
  const message = req.body.message;
  const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
  
  // Handle subscription events
  // Update database based on notification type
  
  res.status(200).send('OK');
});
```

---

## 📊 **Analytics and Reporting**

### **Key Metrics to Track**

```sql
-- Subscription conversion funnel
SELECT 
  COUNT(CASE WHEN subscription_tier = 'free' THEN 1 END) as free_users,
  COUNT(CASE WHEN subscription_tier = 'pro' THEN 1 END) as pro_users,
  COUNT(CASE WHEN subscription_tier = 'enterprise' THEN 1 END) as enterprise_users
FROM profiles;

-- Monthly recurring revenue
SELECT 
  DATE_TRUNC('month', created_at) as month,
  subscription_tier,
  billing_cycle,
  COUNT(*) as subscriptions,
  SUM(CASE 
    WHEN subscription_tier = 'pro' AND billing_cycle = 'monthly' THEN 9.99
    WHEN subscription_tier = 'pro' AND billing_cycle = 'yearly' THEN 99.99/12
    WHEN subscription_tier = 'enterprise' AND billing_cycle = 'monthly' THEN 29.99
    WHEN subscription_tier = 'enterprise' AND billing_cycle = 'yearly' THEN 299.99/12
  END) as mrr
FROM user_subscriptions 
WHERE status = 'active'
GROUP BY month, subscription_tier, billing_cycle
ORDER BY month DESC;

-- Churn analysis
SELECT 
  DATE_TRUNC('month', updated_at) as month,
  COUNT(*) as cancelled_subscriptions
FROM user_subscriptions 
WHERE status = 'cancelled'
GROUP BY month
ORDER BY month DESC;
```

---

## 🔐 **Security Considerations**

### **Receipt Validation Security**
- ✅ Always verify receipts server-side (never trust mobile app)
- ✅ Store Apple shared secret securely
- ✅ Use Google service account with minimal permissions
- ✅ Validate purchase belongs to authenticated user
- ✅ Prevent replay attacks with transaction ID uniqueness

### **Environment Configuration**
```env
# Apple App Store
APPLE_SHARED_SECRET=your_apple_shared_secret
APPLE_VERIFY_URL_PRODUCTION=https://buy.itunes.apple.com/verifyReceipt
APPLE_VERIFY_URL_SANDBOX=https://sandbox.itunes.apple.com/verifyReceipt

# Google Play
GOOGLE_APPLICATION_NAME=SoundBridge
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY_PATH=/path/to/service-account.json
```

---

## 🧪 **Testing Checklist**

### **Development Testing:**
- [ ] Product configuration API returns correct data
- [ ] Purchase verification works with sandbox receipts
- [ ] Database updates correctly on successful verification
- [ ] Error handling for invalid receipts
- [ ] User profile updates with subscription status

### **Production Testing:**
- [ ] Real App Store purchases verify correctly
- [ ] Google Play purchases verify correctly
- [ ] Webhook notifications update subscription status
- [ ] Subscription renewals process automatically
- [ ] Cancellations are handled properly

---

## 📞 **Integration Support**

### **Mobile App Expectations:**
The mobile app is already configured to:
- Send exactly the data formats shown above
- Handle your API response formats
- Retry failed verification attempts
- Show appropriate error messages

### **Common Integration Issues:**
- **Product IDs must match exactly** between app stores and your API
- **Receipt verification must happen server-side** for security
- **Subscription status should update** user profiles immediately
- **Error responses should be** clear and actionable

**Your backend team has already implemented the core functionality - this guide helps ensure everything works together seamlessly!** 🚀
