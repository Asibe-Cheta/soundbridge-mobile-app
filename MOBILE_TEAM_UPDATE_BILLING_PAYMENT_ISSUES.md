# 📱 Mobile Team Update: Critical Billing & Payment Issues

**Date:** December 2024  
**Priority:** 🚨 **CRITICAL**  
**Status:** Action Required  
**Target:** Mobile App Development Team

## 📋 **Critical Issues Identified**

Based on the mobile app screenshots, we've identified **two critical issues** that require immediate attention:

### **1. 🚨 Billing & Usage Screen - Mock Data Issue**
- **Problem:** The "Billing & Usage" screen displays **mock data** instead of real user data
- **Impact:** Users see fake financial information, not their actual billing/usage
- **Priority:** **CRITICAL** - Financial data integrity issue

### **2. 🚨 Payment Methods Screen - Hardcoded Bank Details**
- **Problem:** Manual bank addition form shows **hardcoded data** and lacks location-aware fields
- **Impact:** Users can't add bank details for non-US countries, currency hardcoded to USD
- **Priority:** **CRITICAL** - Global user experience issue

---

## 🔧 **Issue 1: Billing & Usage Screen - Mock Data**

### **❌ Current Problems:**
- **Current Plan:** Shows hardcoded "Pro Plan - $9.99/month" 
- **Usage Statistics:** Shows fake uploads (7/10), storage (1.2 GB / 2 GB), bandwidth (850 MB / 10 GB)
- **Revenue & Payouts:** Shows fake earnings ($245.67), pending ($32.45), payouts ($180.22)
- **No real-time data** from backend APIs

### **✅ Required Actions:**

#### **1. Integrate Real Data APIs**
```typescript
// Use these existing web app APIs for real data:

// For Current Plan & Usage Statistics
GET /api/user/subscription-status
GET /api/user/usage-statistics

// For Revenue & Payouts
GET /api/wallet/balance
GET /api/wallet/transactions
GET /api/revenue/payouts
```

#### **2. Implement Data Fetching**
```typescript
// Example implementation for mobile app
const fetchBillingData = async () => {
  try {
    // Fetch subscription data
    const subscriptionResponse = await fetch('/api/user/subscription-status', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    const subscriptionData = await subscriptionResponse.json();

    // Fetch wallet balance
    const balanceResponse = await fetch('/api/wallet/balance', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    const balanceData = await balanceResponse.json();

    // Fetch transaction history
    const transactionsResponse = await fetch('/api/wallet/transactions', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    const transactionsData = await transactionsResponse.json();

    // Update UI with real data
    updateBillingUI({
      currentPlan: subscriptionData.plan,
      planStatus: subscriptionData.status,
      monthlyCost: subscriptionData.price,
      currentPeriod: subscriptionData.billingPeriod,
      usageStats: subscriptionData.usage,
      totalEarnings: balanceData.totalEarnings,
      pendingEarnings: balanceData.pendingEarnings,
      lastPayout: transactionsData.lastPayout,
      nextPayout: transactionsData.nextPayout
    });
  } catch (error) {
    console.error('Error fetching billing data:', error);
    showErrorState();
  }
};
```

#### **3. Update UI Components**
- **Remove all hardcoded values** from the Billing & Usage screen
- **Add loading states** while fetching data
- **Add error handling** for failed API calls
- **Implement real-time updates** for dynamic data

---

## 🔧 **Issue 2: Payment Methods Screen - Hardcoded Bank Details**

### **❌ Current Problems:**
- **Hardcoded fields:** "John Doe", "Bank of America", "123456789", "USD"
- **No country selection** - form assumes US banking
- **Routing Number field** shown for all countries (not applicable to UK/EU)
- **Currency hardcoded to USD** (should be dynamic based on country)
- **No location detection** or country-aware form fields

### **✅ Required Actions:**

#### **1. Implement Country-Aware Bank Form**
```typescript
// Use these web app APIs for country-aware banking:

// Get list of supported countries
GET /api/banking/countries

// Get country-specific banking requirements
GET /api/banking/country/[countryCode]

// Submit bank details with country info
POST /api/wallet/withdrawal-methods
```

#### **2. Add Country Selection**
```typescript
// Implement country selection similar to web app's CountrySelector
const CountrySelector = () => {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [bankingFields, setBankingFields] = useState([]);

  useEffect(() => {
    // Fetch supported countries
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/banking/countries', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setCountries(data.countries);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const handleCountrySelect = async (countryCode) => {
    try {
      // Fetch country-specific banking requirements
      const response = await fetch(`/api/banking/country/${countryCode}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setBankingFields(data.fields);
      setSelectedCountry(data);
    } catch (error) {
      console.error('Error fetching country banking info:', error);
    }
  };
};
```

#### **3. Dynamic Form Fields**
```typescript
// Render form fields based on selected country
const renderBankingFields = () => {
  if (!bankingFields.length) return null;

  return bankingFields.map((field, index) => (
    <View key={index} style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      <TextInput
        style={styles.fieldInput}
        placeholder={field.placeholder}
        value={formData[field.name]}
        onChangeText={(text) => updateFormData(field.name, text)}
        keyboardType={field.keyboardType || 'default'}
      />
      {field.validation && (
        <Text style={styles.validationText}>{field.validation}</Text>
      )}
    </View>
  ));
};
```

#### **4. Submit Bank Details with Country Info**
```typescript
const submitBankDetails = async () => {
  try {
    const bankData = {
      method_type: 'bank_transfer',
      method_name: `${selectedCountry.name} Bank Account`,
      country: selectedCountry.code,
      currency: selectedCountry.currency,
      banking_system: selectedCountry.bankingSystem,
      bank_details: {
        account_holder_name: formData.accountHolderName,
        bank_name: formData.bankName,
        ...formData // Include all country-specific fields
      }
    };

    const response = await fetch('/api/wallet/withdrawal-methods', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bankData)
    });

    if (response.ok) {
      showSuccessMessage('Bank account added successfully');
      navigateBack();
    } else {
      showErrorMessage('Failed to add bank account');
    }
  } catch (error) {
    console.error('Error submitting bank details:', error);
    showErrorMessage('Network error. Please try again.');
  }
};
```

---

## 🌍 **Global Banking Support Implementation**

### **Country-Specific Banking Fields:**

#### **🇺🇸 United States:**
- Account Holder Name
- Bank Name
- Account Number
- Routing Number
- Account Type (Checking/Savings)
- Currency: USD

#### **🇬🇧 United Kingdom:**
- Account Holder Name
- Bank Name
- Account Number
- Sort Code
- Account Type (Personal/Business)
- Currency: GBP

#### **🇪🇺 European Union:**
- Account Holder Name
- Bank Name
- IBAN
- BIC/SWIFT Code
- Currency: EUR

#### **🇳🇬 Nigeria:**
- Account Holder Name
- Bank Name
- Account Number
- Bank Code
- Account Type
- Currency: NGN

### **Dynamic Currency Display:**
```typescript
// Currency mapping based on country
const getCurrencyForCountry = (countryCode) => {
  const currencyMap = {
    'US': 'USD', 'GB': 'GBP', 'CA': 'CAD', 'AU': 'AUD',
    'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'IT': 'EUR', 'NL': 'EUR',
    'JP': 'JPY', 'SG': 'SGD', 'HK': 'HKD', 'MY': 'MYR', 'TH': 'THB',
    'NZ': 'NZD', 'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK',
    'NG': 'NGN', 'ZA': 'ZAR', 'KE': 'KES', 'GH': 'GHS'
  };
  return currencyMap[countryCode] || 'USD';
};
```

---

## 🚀 **Implementation Checklist**

### **✅ Billing & Usage Screen:**
- [ ] Remove all hardcoded mock data
- [ ] Integrate with `/api/user/subscription-status`
- [ ] Integrate with `/api/wallet/balance`
- [ ] Integrate with `/api/wallet/transactions`
- [ ] Add loading states for API calls
- [ ] Add error handling for failed requests
- [ ] Implement real-time data updates
- [ ] Test with actual user accounts

### **✅ Payment Methods Screen:**
- [ ] Remove hardcoded bank details
- [ ] Add country selection dropdown
- [ ] Implement location detection
- [ ] Add dynamic form fields based on country
- [ ] Integrate with `/api/banking/countries`
- [ ] Integrate with `/api/banking/country/[countryCode]`
- [ ] Integrate with `/api/wallet/withdrawal-methods`
- [ ] Add proper currency handling
- [ ] Test with different countries

---

## 📞 **Support & Resources**

### **API Documentation:**
- **Billing APIs:** `/api/user/subscription-status`, `/api/user/usage-statistics`
- **Wallet APIs:** `/api/wallet/balance`, `/api/wallet/transactions`
- **Banking APIs:** `/api/banking/countries`, `/api/banking/country/[countryCode]`
- **Withdrawal APIs:** `/api/wallet/withdrawal-methods`

### **Authentication:**
- Use `Authorization: Bearer ${token}` header
- Or use `x-authorization`, `x-auth-token`, `x-supabase-token` headers
- Ensure proper token management

### **Testing:**
- Test with different user accounts
- Test with different countries
- Test with different currencies
- Test error scenarios (network failures, invalid data)

---

**Status:** 🚨 **CRITICAL ISSUES IDENTIFIED**  
**Action Required:** **IMMEDIATE**  
**Deadline:** **ASAP**

The mobile app must integrate with the existing web app APIs to provide real data instead of mock data. This is essential for user trust and proper functionality.

**Contact:** For questions about API integration or implementation details, refer to the web app team or the existing API documentation.
