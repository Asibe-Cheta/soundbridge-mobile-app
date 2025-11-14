# 🤖 **Google Play Console Configuration Guide**

## 📋 **Prerequisites**
- ✅ Active Google Play Developer Account ($25 one-time)
- ✅ Access to Google Play Console
- ✅ SoundBridge mobile app code ready for build

---

## 🚀 **Step 1: Create Your App in Google Play Console**

### **1.1 Access Google Play Console**
1. Go to [play.google.com/console](https://play.google.com/console)
2. Sign in with your Google account
3. Accept Developer Agreement if first time

### **1.2 Create New App**
1. Click **"Create app"**
2. Fill in the details:
   ```
   App name: SoundBridge
   Default language: English (United States)
   App or game: App
   Free or paid: Free (with in-app purchases)
   ```
3. **Declarations:**
   ```
   ✅ Developer Program Policies
   ✅ US export laws
   ```
4. Click **"Create app"**

### **1.3 Set Up App Details**
1. Go to **"App information"** in left sidebar
2. Fill in basic details:
   ```
   Package name: com.soundbridge.mobile
   App category: Music & Audio
   Target audience: 13+ (Teen)
   ```

---

## 💳 **Step 2: Configure In-App Products**

### **2.1 Navigate to Monetization**
1. In left sidebar, click **"Monetize"**
2. Click **"Products"**
3. Click **"In-app products"**

### **2.2 Create Subscription Products**

#### **Pro Monthly Subscription:**
1. Click **"Create product"**
2. Select **"Subscription"**
3. Fill in details:
   ```
   Product ID: soundbridge_pro_monthly
   Name: Pro Monthly
   Description: Unlock unlimited uploads, high-quality audio, advanced analytics, and monetization tools. Perfect for serious creators.
   ```
4. **Pricing:**
   ```
   Base plan ID: monthly
   Billing period: 1 Month
   Price: $9.99 USD
   ```
5. **Eligibility:**
   ```
   Countries: All countries
   ```
6. Click **"Save"**

#### **Pro Yearly Subscription:**
1. Click **"Create product"**
2. Select **"Subscription"**
3. Fill in details:
   ```
   Product ID: soundbridge_pro_yearly
   Name: Pro Yearly
   Description: Unlock unlimited uploads, high-quality audio, advanced analytics, and monetization tools. Save 17% with annual billing.
   ```
4. **Pricing:**
   ```
   Base plan ID: yearly
   Billing period: 1 Year
   Price: $99.99 USD
   ```
5. **Special offers:**
   ```
   Free trial: 7 days (optional)
   Introductory price: None
   ```
6. Click **"Save"**

#### **Enterprise Monthly Subscription:**
1. Click **"Create product"**
2. Select **"Subscription"**
3. Fill in details:
   ```
   Product ID: soundbridge_enterprise_monthly
   Name: Enterprise Monthly
   Description: Everything in Pro plus team collaboration, white-label solution, API access, and dedicated support.
   ```
4. **Pricing:**
   ```
   Base plan ID: monthly
   Billing period: 1 Month
   Price: $29.99 USD
   ```
5. Click **"Save"**

#### **Enterprise Yearly Subscription:**
1. Click **"Create product"**
2. Select **"Subscription"**
3. Fill in details:
   ```
   Product ID: soundbridge_enterprise_yearly
   Name: Enterprise Yearly
   Description: Everything in Pro plus team collaboration, white-label solution, API access, and dedicated support. Save 17% with annual billing.
   ```
4. **Pricing:**
   ```
   Base plan ID: yearly
   Billing period: 1 Year
   Price: $299.99 USD
   ```
5. Click **"Save"**

### **2.3 Activate All Products**
1. For each product, click **"Activate"**
2. Verify all 4 products show as **"Active"**

---

## 🧪 **Step 3: Set Up License Testing**

### **3.1 Configure Test Accounts**
1. Go to **"Setup"** → **"License testing"**
2. Add test email addresses:
   ```
   Test emails:
   - your-test-email@gmail.com
   - team-member@gmail.com
   ```
3. **License response:**
   ```
   Select: RESPOND_NORMALLY
   ```
4. Click **"Save changes"**

### **3.2 Create Internal Testing Track**
1. Go to **"Testing"** → **"Internal testing"**
2. Click **"Create new release"**
3. You'll upload APK here after building

---

## 🏗️ **Step 4: Prepare App for Build**

### **4.1 Update app.json/app.config.js**
```json
{
  "expo": {
    "name": "SoundBridge",
    "slug": "soundbridge-mobile",
    "version": "1.0.0",
    "android": {
      "package": "com.soundbridge.mobile",
      "versionCode": 1,
      "permissions": [
        "INTERNET",
        "WRITE_EXTERNAL_STORAGE",
        "READ_EXTERNAL_STORAGE"
      ],
      "config": {
        "googleServicesFile": "./google-services.json"
      }
    }
  }
}
```

### **4.2 Build Commands**
```bash
# Using Expo CLI (legacy)
expo build:android

# Using EAS Build (recommended)
eas build --platform android
```

---

## 📱 **Step 5: Upload and Test**

### **5.1 Upload APK to Internal Testing**
1. Go to **"Testing"** → **"Internal testing"**
2. Click **"Create new release"**
3. Upload your built APK file
4. Fill in **"Release notes"**:
   ```
   Initial version with subscription functionality
   Test the upgrade flow and payment processing
   ```
5. Click **"Save"** then **"Review release"**
6. Click **"Start rollout to internal testing"**

### **5.2 Add Internal Testers**
1. In **"Internal testing"**, click **"Testers"** tab
2. Click **"Create email list"**
3. Add tester emails:
   ```
   List name: SoundBridge Beta Testers
   Email addresses: your-test-emails
   ```
4. Click **"Save changes"**

### **5.3 Install Test App**
1. Testers will receive invitation email
2. Click link in email to install from Play Store
3. Or visit Play Store and search for your app (will show as "Internal testing")

---

## 🧪 **Step 6: Test Real Payments**

### **6.1 Test Subscription Flow**
1. Open SoundBridge app on Android device
2. Navigate to **Profile → Settings → Upgrade Plan**
3. Tap any subscription button
4. Complete Google Play billing flow
5. Use test account if configured

### **6.2 Test Purchase Verification**
1. Check app console logs for purchase verification
2. Verify subscription status updates in your backend
3. Test that premium features unlock properly

### **6.3 Test Edge Cases**
- **Cancel subscription**: Test cancellation flow
- **Restore purchases**: Test on new device
- **Upgrade/downgrade**: Test plan changes

---

## 📊 **Step 7: Configure App Store Listing**

### **7.1 Store Listing**
1. Go to **"Main store listing"**
2. Fill in details:
   ```
   App name: SoundBridge
   Short description: Create, share, and monetize your music
   Full description: SoundBridge is the ultimate platform for music creators...
   ```

### **7.2 Graphics Assets**
Upload required assets:
```
App icon: 512 x 512 PNG
Feature graphic: 1024 x 500 PNG
Screenshots: At least 2 per supported device type
```

### **7.3 Content Rating**
1. Go to **"Content rating"**
2. Complete questionnaire
3. Most music apps get **"Everyone"** or **"Teen"** rating

---

## 🚀 **Step 8: Production Release**

### **8.1 Create Production Release**
1. Go to **"Production"** track
2. Click **"Create new release"**
3. Upload same APK from internal testing
4. Add release notes
5. Click **"Save"** then **"Review release"**

### **8.2 Submit for Review**
1. Complete all required sections:
   - ✅ Main store listing
   - ✅ Content rating
   - ✅ Target audience
   - ✅ Privacy policy
   - ✅ App content
2. Click **"Publish to production"**

### **8.3 Review Process**
- **Review time**: Usually 1-3 days
- **Status updates**: Check in Play Console
- **Email notifications**: Google will send updates

---

## 🔧 **Google Play Billing Integration**

### **8.1 Server-Side Verification**
Your backend should verify purchases using Google Play Developer API:

```javascript
// Example verification endpoint
const { google } = require('googleapis');

async function verifyPurchase(packageName, productId, purchaseToken) {
  const playDeveloperApi = google.androidpublisher({
    version: 'v3',
    auth: serviceAccountAuth // Configure with service account
  });

  const result = await playDeveloperApi.purchases.subscriptions.get({
    packageName: packageName,
    subscriptionId: productId,
    token: purchaseToken
  });

  return result.data;
}
```

### **8.2 Real-Time Developer Notifications**
1. Go to **"Monetize"** → **"Monetization setup"**
2. Configure **"Real-time developer notifications"**
3. Set endpoint URL: `https://soundbridge.live/api/google-play/webhook`
4. This sends purchase updates to your backend

---

## 💰 **Revenue and Reporting**

### **9.1 Revenue Reports**
1. Go to **"Earnings"** → **"Revenue"**
2. View subscription revenue by:
   - Time period
   - Product
   - Country
   - Device type

### **9.2 User Metrics**
1. Go to **"Statistics"** → **"Overview"**
2. Track:
   - Downloads
   - Active users
   - Subscription conversions
   - Retention rates

---

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **Product Not Found:**
- Verify product IDs match exactly in code
- Ensure products are activated in Play Console
- Check app is signed with same certificate

#### **Purchase Verification Fails:**
- Check Google Play Developer API credentials
- Verify webhook endpoint is accessible
- Test with sandbox purchases first

#### **App Upload Fails:**
- Ensure package name matches Play Console
- Check signing certificate
- Verify all required permissions

### **Debug Tools:**
```bash
# Test purchase verification
adb logcat | grep "BillingClient"

# Check product availability
adb logcat | grep "SkuDetails"
```

---

## 📞 **Support Resources**

### **Documentation:**
- **Google Play Billing**: [developer.android.com/google/play/billing](https://developer.android.com/google/play/billing)
- **Play Console Help**: [support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer)
- **Subscriptions Guide**: [developer.android.com/google/play/billing/subscriptions](https://developer.android.com/google/play/billing/subscriptions)

### **Testing Tools:**
- **Play Console**: Internal testing and staged rollouts
- **Firebase Test Lab**: Automated testing on real devices
- **Android Studio**: Local testing and debugging

---

## ✅ **Checklist for Go-Live**

### **Pre-Launch:**
- [ ] All 4 subscription products configured and activated
- [ ] Internal testing completed successfully
- [ ] Real purchase flow tested end-to-end
- [ ] Backend receipt verification working
- [ ] Store listing complete with screenshots
- [ ] Content rating obtained
- [ ] Privacy policy published

### **Post-Launch:**
- [ ] Monitor revenue reports
- [ ] Track user conversion rates
- [ ] Set up automated reports
- [ ] Plan feature updates based on analytics
- [ ] Monitor user reviews and feedback

**Estimated Time:** 2-3 hours for initial setup + 1-3 days for Google review

**Ready to combine with iOS? Both platforms can share the same backend integration!** 🚀
