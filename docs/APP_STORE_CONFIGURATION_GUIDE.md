# 🍎 **iOS App Store Connect Configuration Guide**

## 📋 **Prerequisites**
- ✅ Active Apple Developer Account ($99/year)
- ✅ Access to App Store Connect
- ✅ SoundBridge mobile app code ready for build

---

## 🚀 **Step 1: Create Your App in App Store Connect**

### **1.1 Access App Store Connect**
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Sign in with your Apple Developer account
3. Click **"My Apps"**

### **1.2 Create New App**
1. Click the **"+"** button
2. Select **"New App"**
3. Fill in the details:
   ```
   Platform: iOS
   Name: SoundBridge
   Primary Language: English (U.S.)
   Bundle ID: com.soundbridge.mobile (create new)
   SKU: soundbridge-mobile-001
   User Access: Full Access
   ```
4. Click **"Create"**

---

## 💳 **Step 2: Configure In-App Purchases**

### **2.1 Navigate to IAP Section**
1. In your app's dashboard, click **"Features"** tab
2. Click **"In-App Purchases"**
3. Click **"Manage"**

### **2.2 Create Subscription Group**
1. Click **"+"** to create new subscription group
2. Fill in details:
   ```
   Reference Name: SoundBridge Subscriptions
   App Name: SoundBridge
   ```
3. Click **"Create"**

### **2.3 Create Individual Subscriptions**

#### **Pro Monthly Subscription:**
1. Click **"+"** in your subscription group
2. Select **"Auto-Renewable Subscription"**
3. Fill in details:
   ```
   Product ID: com.soundbridge.pro.monthly
   Reference Name: SoundBridge Pro Monthly
   Subscription Duration: 1 Month
   ```
4. **Subscription Pricing:**
   ```
   Price: $9.99 USD
   Territory: All territories (or select specific ones)
   ```
5. **App Store Information:**
   ```
   Display Name: Pro Monthly
   Description: Unlock unlimited uploads, high-quality audio, advanced analytics, and monetization tools. Perfect for serious creators who want to take their music to the next level.
   ```
6. **Review Information:**
   ```
   Screenshot: Upload a screenshot of the upgrade screen
   Review Notes: SoundBridge Pro subscription unlocks premium creator features
   ```
7. Click **"Save"**

#### **Pro Yearly Subscription:**
1. Click **"+"** in your subscription group
2. Select **"Auto-Renewable Subscription"**
3. Fill in details:
   ```
   Product ID: com.soundbridge.pro.yearly
   Reference Name: SoundBridge Pro Yearly
   Subscription Duration: 1 Year
   ```
4. **Subscription Pricing:**
   ```
   Price: $99.99 USD (17% savings vs monthly)
   Territory: All territories
   ```
5. **App Store Information:**
   ```
   Display Name: Pro Yearly
   Description: Unlock unlimited uploads, high-quality audio, advanced analytics, and monetization tools. Save 17% with annual billing.
   ```
6. **Review Information:**
   ```
   Screenshot: Upload a screenshot of the upgrade screen
   Review Notes: SoundBridge Pro yearly subscription with savings
   ```
7. Click **"Save"**

#### **Enterprise Monthly Subscription:**
1. Click **"+"** in your subscription group
2. Select **"Auto-Renewable Subscription"**
3. Fill in details:
   ```
   Product ID: com.soundbridge.enterprise.monthly
   Reference Name: SoundBridge Enterprise Monthly
   Subscription Duration: 1 Month
   ```
4. **Subscription Pricing:**
   ```
   Price: $29.99 USD
   Territory: All territories
   ```
5. **App Store Information:**
   ```
   Display Name: Enterprise Monthly
   Description: Everything in Pro plus team collaboration, white-label solution, API access, and dedicated support. Perfect for teams and businesses.
   ```
6. **Review Information:**
   ```
   Screenshot: Upload a screenshot of the upgrade screen
   Review Notes: SoundBridge Enterprise subscription for teams and businesses
   ```
7. Click **"Save"**

#### **Enterprise Yearly Subscription:**
1. Click **"+"** in your subscription group
2. Select **"Auto-Renewable Subscription"**
3. Fill in details:
   ```
   Product ID: com.soundbridge.enterprise.yearly
   Reference Name: SoundBridge Enterprise Yearly
   Subscription Duration: 1 Year
   ```
4. **Subscription Pricing:**
   ```
   Price: $299.99 USD (17% savings vs monthly)
   Territory: All territories
   ```
5. **App Store Information:**
   ```
   Display Name: Enterprise Yearly
   Description: Everything in Pro plus team collaboration, white-label solution, API access, and dedicated support. Save 17% with annual billing.
   ```
6. **Review Information:**
   ```
   Screenshot: Upload a screenshot of the upgrade screen
   Review Notes: SoundBridge Enterprise yearly subscription with savings
   ```
7. Click **"Save"**

---

## 🧪 **Step 3: Set Up Sandbox Testing**

### **3.1 Create Sandbox Tester Account**
1. In App Store Connect, go to **"Users and Access"**
2. Click **"Sandbox Testers"**
3. Click **"+"** to add new tester
4. Fill in details:
   ```
   First Name: Test
   Last Name: User
   Email: test@yourdomain.com (must be unique)
   Password: Create strong password
   Confirm Password: Same as above
   Territory: United States
   App Store Territory: United States
   ```
5. Click **"Invite"**

### **3.2 Configure Sandbox Settings**
1. Go to your device's **Settings > App Store**
2. Sign out of your real Apple ID
3. Don't sign in to sandbox account yet (wait for app installation)

---

## 📱 **Step 4: Submit Subscriptions for Review**

### **4.1 Review All Products**
1. Go back to **"In-App Purchases"**
2. Verify all 4 products are configured correctly
3. Check that all required fields are filled

### **4.2 Submit for Review**
1. For each product, click **"Submit for Review"**
2. Apple will review within 24-48 hours
3. You'll receive email notifications about approval status

**⚠️ Important:** Subscriptions must be approved before testing real payments!

---

## 🏗️ **Step 5: Prepare App for Build**

### **5.1 Update app.json/app.config.js**
```json
{
  "expo": {
    "name": "SoundBridge",
    "slug": "soundbridge-mobile",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.soundbridge.mobile",
      "buildNumber": "1",
      "supportsTablet": true,
      "config": {
        "usesNonExemptEncryption": false
      }
    }
  }
}
```

### **5.2 Build Commands**
```bash
# Using Expo CLI (legacy)
expo build:ios

# Using EAS Build (recommended)
eas build --platform ios
```

---

## 📊 **Step 6: TestFlight Setup**

### **6.1 Upload Build**
1. After successful build, download `.ipa` file
2. Use **Transporter app** or **Xcode** to upload to App Store Connect
3. Wait for processing (5-15 minutes)

### **6.2 Configure TestFlight**
1. In App Store Connect, go to **"TestFlight"** tab
2. Select your uploaded build
3. Add **"Test Information"**:
   ```
   What to Test: Test the subscription upgrade flow
   App Review Information: Standard music streaming app with premium subscriptions
   ```
4. Click **"Save"**

### **6.3 Add Internal Testers**
1. Click **"Internal Testing"**
2. Click **"+"** to add testers
3. Add email addresses of team members
4. Click **"Send Invites"**

---

## 🧪 **Step 7: Test Real Payments**

### **7.1 Install TestFlight App**
1. Download **TestFlight** app from App Store
2. Accept invitation email
3. Install SoundBridge from TestFlight

### **7.2 Test Sandbox Payments**
1. Open SoundBridge app
2. Navigate to **Profile → Settings → Upgrade Plan**
3. Tap any subscription button
4. When prompted, sign in with sandbox test account
5. Complete purchase flow
6. Verify subscription activation

### **7.3 Verify Receipt Validation**
1. Check app console logs for receipt verification
2. Verify subscription status updates in your backend
3. Test subscription features unlock properly

---

## ✅ **Step 8: Production Release**

### **8.1 App Store Submission**
1. In **"App Store"** tab, click **"Prepare for Submission"**
2. Fill in all required metadata
3. Upload screenshots and app preview
4. Set **"Pricing and Availability"**
5. Submit for App Store review

### **8.2 Go Live**
1. Wait for Apple approval (1-7 days)
2. Once approved, click **"Release This Version"**
3. App will be live on App Store within hours

---

## 🔧 **Troubleshooting**

### **Common Issues:**
- **Subscription not appearing**: Check product IDs match exactly
- **Purchase fails**: Verify sandbox account setup
- **Receipt validation error**: Check backend API configuration
- **Build upload fails**: Verify bundle identifier matches

### **Support Resources:**
- **Apple Developer Documentation**: [developer.apple.com/documentation](https://developer.apple.com/documentation)
- **App Store Connect Help**: [help.apple.com/app-store-connect](https://help.apple.com/app-store-connect)
- **TestFlight Guide**: [developer.apple.com/testflight](https://developer.apple.com/testflight)

---

## 📞 **Next Steps After Configuration**

1. ✅ Configure Android (see Google Play guide)
2. ✅ Test both platforms thoroughly
3. ✅ Monitor analytics and revenue
4. ✅ Iterate based on user feedback

**Estimated Time:** 2-3 hours for initial setup + 24-48 hours for Apple review

**Ready to configure Android? See the Google Play Configuration Guide!** 🚀
