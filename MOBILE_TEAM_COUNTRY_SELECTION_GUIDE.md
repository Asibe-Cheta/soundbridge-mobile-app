# 🌍 Country Selection Implementation Guide - Mobile App

**Date:** October 6, 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Priority:** 🔴 **HIGH** - Required for Onboarding  
**Status:** ✅ **DATABASE READY** - Implementation Guide Provided

---

## 📋 **OVERVIEW**

The web app now supports **200+ countries** with comprehensive country data including:
- Country name
- Country code (ISO 2-letter)
- Currency
- Timezone
- Language

The mobile app should implement country selection in the onboarding flow (Location Step) to match the web app's functionality.

---

## 🗄️ **DATABASE SCHEMA**

### **Profiles Table Structure**

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'listener',
  
  -- ✅ COUNTRY FIELDS (Already implemented in database)
  country VARCHAR(100),              -- Full country name (e.g., "United States")
  country_code VARCHAR(2),           -- ISO 2-letter code (e.g., "US")
  timezone VARCHAR(50),              -- User's timezone (e.g., "America/New_York")
  currency VARCHAR(3) DEFAULT 'USD', -- User's currency (e.g., "USD", "GBP", "NGN")
  language VARCHAR(5) DEFAULT 'en',  -- User's language (e.g., "en", "fr", "es")
  
  -- Other fields
  genres TEXT[],
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step TEXT DEFAULT 'role_selection',
  selected_role TEXT,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Indexes**
```sql
CREATE INDEX idx_profiles_country ON profiles(country);
CREATE INDEX idx_profiles_country_code ON profiles(country_code);
```

---

## 🌐 **AVAILABLE COUNTRIES (200+)**

### **Regions Covered:**

#### **🌍 Africa (50+ countries)**
- Nigeria (NG) - NGN - Africa/Lagos
- South Africa (ZA) - ZAR - Africa/Johannesburg
- Kenya (KE) - KES - Africa/Nairobi
- Ghana (GH) - GHS - Africa/Accra
- Egypt (EG) - EGP - Africa/Cairo
- Morocco (MA) - MAD - Africa/Casablanca
- Tunisia (TN) - TND - Africa/Tunis
- Algeria (DZ) - DZD - Africa/Algiers
- Ethiopia (ET) - ETB - Africa/Addis_Ababa
- Uganda (UG) - UGX - Africa/Kampala
- Tanzania (TZ) - TZS - Africa/Dar_es_Salaam
- Rwanda (RW) - RWF - Africa/Kigali
- Zambia (ZM) - ZMW - Africa/Lusaka
- Zimbabwe (ZW) - ZWL - Africa/Harare
- Botswana (BW) - BWP - Africa/Gaborone
- Namibia (NA) - NAD - Africa/Windhoek
- Mozambique (MZ) - MZN - Africa/Maputo
- Angola (AO) - AOA - Africa/Luanda
- Cameroon (CM) - XAF - Africa/Douala
- Ivory Coast (CI) - XOF - Africa/Abidjan
- Senegal (SN) - XOF - Africa/Dakar
- Mali (ML) - XOF - Africa/Bamako
- And 30+ more African countries...

#### **🌎 Americas (40+ countries)**
- United States (US) - USD - America/New_York
- Canada (CA) - CAD - America/Toronto
- Brazil (BR) - BRL - America/Sao_Paulo
- Mexico (MX) - MXN - America/Mexico_City
- Argentina (AR) - ARS - America/Argentina/Buenos_Aires
- Chile (CL) - CLP - America/Santiago
- Colombia (CO) - COP - America/Bogota
- Peru (PE) - PEN - America/Lima
- Venezuela (VE) - VES - America/Caracas
- Ecuador (EC) - USD - America/Guayaquil
- Jamaica (JM) - JMD - America/Jamaica
- Trinidad and Tobago (TT) - TTD - America/Port_of_Spain
- Costa Rica (CR) - CRC - America/Costa_Rica
- Panama (PA) - PAB - America/Panama
- And 25+ more American countries...

#### **🌏 Asia (50+ countries)**
- Japan (JP) - JPY - Asia/Tokyo
- Singapore (SG) - SGD - Asia/Singapore
- Hong Kong (HK) - HKD - Asia/Hong_Kong
- Malaysia (MY) - MYR - Asia/Kuala_Lumpur
- Thailand (TH) - THB - Asia/Bangkok
- India (IN) - INR - Asia/Kolkata
- China (CN) - CNY - Asia/Shanghai
- South Korea (KR) - KRW - Asia/Seoul
- Indonesia (ID) - IDR - Asia/Jakarta
- Philippines (PH) - PHP - Asia/Manila
- Vietnam (VN) - VND - Asia/Ho_Chi_Minh
- Bangladesh (BD) - BDT - Asia/Dhaka
- Pakistan (PK) - PKR - Asia/Karachi
- Sri Lanka (LK) - LKR - Asia/Colombo
- United Arab Emirates (AE) - AED - Asia/Dubai
- Saudi Arabia (SA) - SAR - Asia/Riyadh
- Qatar (QA) - QAR - Asia/Qatar
- Kuwait (KW) - KWD - Asia/Kuwait
- Turkey (TR) - TRY - Europe/Istanbul
- Israel (IL) - ILS - Asia/Jerusalem
- And 30+ more Asian countries...

#### **🌍 Europe (45+ countries)**
- United Kingdom (GB) - GBP - Europe/London
- Germany (DE) - EUR - Europe/Berlin
- France (FR) - EUR - Europe/Paris
- Spain (ES) - EUR - Europe/Madrid
- Italy (IT) - EUR - Europe/Rome
- Netherlands (NL) - EUR - Europe/Amsterdam
- Switzerland (CH) - CHF - Europe/Zurich
- Sweden (SE) - SEK - Europe/Stockholm
- Norway (NO) - NOK - Europe/Oslo
- Denmark (DK) - DKK - Europe/Copenhagen
- Portugal (PT) - EUR - Europe/Lisbon
- Ireland (IE) - EUR - Europe/Dublin
- Poland (PL) - PLN - Europe/Warsaw
- Czech Republic (CZ) - CZK - Europe/Prague
- Austria (AT) - EUR - Europe/Vienna
- Belgium (BE) - EUR - Europe/Brussels
- Greece (GR) - EUR - Europe/Athens
- And 30+ more European countries...

#### **🌊 Oceania (15+ countries)**
- Australia (AU) - AUD - Australia/Sydney
- New Zealand (NZ) - NZD - Pacific/Auckland
- Fiji (FJ) - FJD - Pacific/Fiji
- Papua New Guinea (PG) - PGK - Pacific/Port_Moresby
- Solomon Islands (SB) - SBD - Pacific/Guadalcanal
- Samoa (WS) - WST - Pacific/Apia
- Tonga (TO) - TOP - Pacific/Tongatapu
- And 10+ more Oceanian countries...

---

## 📦 **COUNTRY DATA STRUCTURE**

### **TypeScript Interface**

```typescript
interface Country {
  code: string;        // ISO 2-letter code (e.g., "US", "GB", "NG")
  name: string;        // Full country name (e.g., "United States")
  currency: string;    // Currency code (e.g., "USD", "GBP", "NGN")
  timezone: string;    // Primary timezone (e.g., "America/New_York")
  language: string;    // Primary language code (e.g., "en", "fr", "es")
}
```

### **Example Country Objects**

```typescript
const exampleCountries: Country[] = [
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    timezone: 'America/New_York',
    language: 'en'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    timezone: 'Europe/London',
    language: 'en'
  },
  {
    code: 'NG',
    name: 'Nigeria',
    currency: 'NGN',
    timezone: 'Africa/Lagos',
    language: 'en'
  },
  {
    code: 'FR',
    name: 'France',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    language: 'fr'
  },
  {
    code: 'JP',
    name: 'Japan',
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
    language: 'ja'
  }
];
```

---

## 🎨 **UI IMPLEMENTATION**

### **Option 1: Searchable Dropdown (Recommended)**

**Recommended** because there are 200+ countries.

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Modal } from 'react-native';

interface Country {
  code: string;
  name: string;
  currency: string;
  timezone: string;
  language: string;
}

const CountrySelector = ({ value, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCountries(countries);
    } else {
      const filtered = countries.filter(country =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCountries(filtered);
    }
  }, [searchTerm, countries]);

  const loadCountries = () => {
    // Load the comprehensive country list
    const countryList: Country[] = [
      { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York', language: 'en' },
      { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', language: 'en' },
      { code: 'CA', name: 'Canada', currency: 'CAD', timezone: 'America/Toronto', language: 'en' },
      { code: 'NG', name: 'Nigeria', currency: 'NGN', timezone: 'Africa/Lagos', language: 'en' },
      { code: 'AU', name: 'Australia', currency: 'AUD', timezone: 'Australia/Sydney', language: 'en' },
      { code: 'DE', name: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin', language: 'de' },
      { code: 'FR', name: 'France', currency: 'EUR', timezone: 'Europe/Paris', language: 'fr' },
      { code: 'ES', name: 'Spain', currency: 'EUR', timezone: 'Europe/Madrid', language: 'es' },
      { code: 'IT', name: 'Italy', currency: 'EUR', timezone: 'Europe/Rome', language: 'it' },
      { code: 'NL', name: 'Netherlands', currency: 'EUR', timezone: 'Europe/Amsterdam', language: 'nl' },
      { code: 'JP', name: 'Japan', currency: 'JPY', timezone: 'Asia/Tokyo', language: 'ja' },
      { code: 'SG', name: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore', language: 'en' },
      { code: 'HK', name: 'Hong Kong', currency: 'HKD', timezone: 'Asia/Hong_Kong', language: 'en' },
      { code: 'MY', name: 'Malaysia', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur', language: 'en' },
      { code: 'TH', name: 'Thailand', currency: 'THB', timezone: 'Asia/Bangkok', language: 'th' },
      { code: 'NZ', name: 'New Zealand', currency: 'NZD', timezone: 'Pacific/Auckland', language: 'en' },
      { code: 'CH', name: 'Switzerland', currency: 'CHF', timezone: 'Europe/Zurich', language: 'de' },
      { code: 'SE', name: 'Sweden', currency: 'SEK', timezone: 'Europe/Stockholm', language: 'sv' },
      { code: 'NO', name: 'Norway', currency: 'NOK', timezone: 'Europe/Oslo', language: 'no' },
      { code: 'DK', name: 'Denmark', currency: 'DKK', timezone: 'Europe/Copenhagen', language: 'da' },
      { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg', language: 'en' },
      { code: 'KE', name: 'Kenya', currency: 'KES', timezone: 'Africa/Nairobi', language: 'en' },
      { code: 'GH', name: 'Ghana', currency: 'GHS', timezone: 'Africa/Accra', language: 'en' },
      { code: 'EG', name: 'Egypt', currency: 'EGP', timezone: 'Africa/Cairo', language: 'ar' },
      { code: 'MA', name: 'Morocco', currency: 'MAD', timezone: 'Africa/Casablanca', language: 'ar' },
      { code: 'BR', name: 'Brazil', currency: 'BRL', timezone: 'America/Sao_Paulo', language: 'pt' },
      { code: 'MX', name: 'Mexico', currency: 'MXN', timezone: 'America/Mexico_City', language: 'es' },
      { code: 'AR', name: 'Argentina', currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires', language: 'es' },
      { code: 'CL', name: 'Chile', currency: 'CLP', timezone: 'America/Santiago', language: 'es' },
      { code: 'CO', name: 'Colombia', currency: 'COP', timezone: 'America/Bogota', language: 'es' },
      { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata', language: 'hi' },
      { code: 'CN', name: 'China', currency: 'CNY', timezone: 'Asia/Shanghai', language: 'zh' },
      { code: 'KR', name: 'South Korea', currency: 'KRW', timezone: 'Asia/Seoul', language: 'ko' },
      { code: 'ID', name: 'Indonesia', currency: 'IDR', timezone: 'Asia/Jakarta', language: 'id' },
      { code: 'PH', name: 'Philippines', currency: 'PHP', timezone: 'Asia/Manila', language: 'en' },
      { code: 'VN', name: 'Vietnam', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', language: 'vi' },
      { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai', language: 'ar' },
      { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', timezone: 'Asia/Riyadh', language: 'ar' },
      { code: 'TR', name: 'Turkey', currency: 'TRY', timezone: 'Europe/Istanbul', language: 'tr' },
      { code: 'PT', name: 'Portugal', currency: 'EUR', timezone: 'Europe/Lisbon', language: 'pt' },
      { code: 'IE', name: 'Ireland', currency: 'EUR', timezone: 'Europe/Dublin', language: 'en' },
      { code: 'PL', name: 'Poland', currency: 'PLN', timezone: 'Europe/Warsaw', language: 'pl' },
      { code: 'CZ', name: 'Czech Republic', currency: 'CZK', timezone: 'Europe/Prague', language: 'cs' },
      { code: 'GR', name: 'Greece', currency: 'EUR', timezone: 'Europe/Athens', language: 'el' },
      // Add remaining 150+ countries from the web app's CountrySelector.tsx
      // Full list available in: apps/web/src/components/onboarding/CountrySelector.tsx
    ];
    setCountries(countryList);
    setFilteredCountries(countryList);
  };

  const handleCountrySelect = (country: Country) => {
    onChange(country.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedCountry = countries.find(c => c.name === value);

  return (
    <View>
      {/* Trigger Button */}
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setIsOpen(true)}
      >
        <Text style={styles.triggerText}>
          {selectedCountry ? selectedCountry.name : 'Select your country'}
        </Text>
      </TouchableOpacity>

      {/* Modal with Search */}
      <Modal visible={isOpen} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#888"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />

            {/* Country List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => handleCountrySelect(item)}
                >
                  <View>
                    <Text style={styles.countryName}>{item.name}</Text>
                    <Text style={styles.countryDetails}>
                      {item.code} • {item.currency}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No countries found</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  triggerButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    backgroundColor: '#222',
  },
  triggerText: {
    color: '#fff',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#fff',
    fontSize: 24,
  },
  searchInput: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  countryItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  countryName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  countryDetails: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    padding: 20,
  },
});

export default CountrySelector;
```

---

## 🔌 **API INTEGRATION**

### **Onboarding Complete Profile Endpoint**

**Endpoint:** `POST https://www.soundbridge.live/api/user/complete-profile`

**Headers:**
```typescript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
  // OR
  'x-supabase-token': 'YOUR_SUPABASE_TOKEN'
}
```

**Request Body:**
```typescript
{
  role: 'creator' | 'listener',          // Required
  display_name: string,                   // Required
  country: string,                        // Full country name (e.g., "United States")
  bio?: string,                          // Optional
  genres?: string[],                     // Array of genre IDs
  avatar_url?: string,                   // Optional
  
  // These fields are automatically populated:
  // - country_code: Derived from country name
  // - timezone: Derived from country
  // - currency: Derived from country
  // - language: Derived from country
}
```

**Example Request:**
```typescript
const completeProfile = async () => {
  try {
    const response = await fetch('https://www.soundbridge.live/api/user/complete-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        role: 'creator',
        display_name: 'John Doe',
        country: 'Nigeria',
        bio: 'Music producer from Lagos',
        genres: ['genre-id-1', 'genre-id-2', 'genre-id-3'],
        avatar_url: 'https://...'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Profile completed:', data.profile);
      // Navigate to home screen
    }
  } catch (error) {
    console.error('Error completing profile:', error);
  }
};
```

**Response:**
```typescript
{
  success: true,
  message: 'Profile completed successfully',
  profile: {
    id: 'uuid',
    username: 'john_doe',
    display_name: 'John Doe',
    bio: 'Music producer from Lagos',
    country: 'Nigeria',
    country_code: 'NG',           // ✅ Auto-populated
    timezone: 'Africa/Lagos',     // ✅ Auto-populated
    currency: 'NGN',              // ✅ Auto-populated
    language: 'en',               // ✅ Auto-populated
    role: 'creator',
    onboarding_completed: true,
    // ... other fields
  }
}
```

---

## 🎯 **ONBOARDING FLOW INTEGRATION**

### **Step-by-Step Integration**

```typescript
// OnboardingScreen.tsx

import React, { useState } from 'react';
import CountrySelector from './CountrySelector';
import GenreSelector from './GenreSelector';

const OnboardingScreen = () => {
  const [step, setStep] = useState(1); // 1: Role, 2: Profile, 3: Location, 4: Genres, 5: Bio
  const [formData, setFormData] = useState({
    role: '',
    displayName: '',
    country: '',
    genres: [],
    bio: ''
  });

  const handleComplete = async () => {
    try {
      const response = await fetch('https://www.soundbridge.live/api/user/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          role: formData.role,
          display_name: formData.displayName,
          country: formData.country,
          genres: formData.genres,
          bio: formData.bio
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Onboarding complete - navigate to home
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  return (
    <View>
      {step === 3 && (
        <View>
          <Text>Where are you based?</Text>
          <CountrySelector
            value={formData.country}
            onChange={(country) => setFormData({ ...formData, country })}
          />
        </View>
      )}
      
      {/* Other steps... */}
    </View>
  );
};
```

---

## 💾 **DATA STORAGE**

### **What Gets Saved**

When a user selects their country during onboarding:

1. **`country`** - Full country name (e.g., "United States")
2. **`country_code`** - Auto-populated (e.g., "US")
3. **`timezone`** - Auto-populated (e.g., "America/New_York")
4. **`currency`** - Auto-populated (e.g., "USD")
5. **`language`** - Auto-populated (e.g., "en")

**Note:** The mobile app only needs to send the `country` field. The backend automatically derives the other fields.

---

## 🎨 **UI/UX RECOMMENDATIONS**

### **Best Practices**

1. **Searchable Dropdown:**
   - With 200+ countries, a searchable interface is essential
   - Allow searching by country name OR country code
   - Show country code and currency in the list for clarity

2. **Popular Countries First (Optional):**
   ```typescript
   const popularCountries = ['US', 'GB', 'NG', 'CA', 'AU', 'DE', 'FR'];
   // Show these at the top of the list
   ```

3. **Visual Indicators:**
   - Show flag emoji or icon (optional)
   - Display currency code
   - Highlight selected country

4. **Mobile-Friendly:**
   - Use modal/bottom sheet for selection
   - Large touch targets (min 44px height)
   - Clear "Done" or "Select" button
   - Easy to dismiss

5. **Validation:**
   - Require country selection before proceeding
   - Show error if user tries to skip

---

## 📝 **COMPLETE COUNTRY LIST**

**For the complete list of 200+ countries with all details, see:**
- `apps/web/src/components/onboarding/CountrySelector.tsx` (lines 23-241)

**Or copy the country array from the web app:**
```typescript
// COUNTRIES array contains all 200+ countries
const COUNTRIES: Country[] = [
  // See CountrySelector.tsx for full list
];
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Mobile Team TODO:**

- [ ] **Create `CountrySelector` component**
  - [ ] Implement searchable dropdown/modal
  - [ ] Load 200+ countries from list
  - [ ] Add search functionality (by name and code)
  - [ ] Style to match app theme

- [ ] **Integrate in Onboarding Flow**
  - [ ] Add Location step after Profile step
  - [ ] Before Genres step
  - [ ] Store selected country in form state

- [ ] **Update API Call**
  - [ ] Include `country` field in `/api/user/complete-profile`
  - [ ] Handle response with auto-populated fields

- [ ] **Add Validation**
  - [ ] Require country selection
  - [ ] Show error if empty
  - [ ] Disable "Next" button until selected

- [ ] **Test with Various Countries**
  - [ ] Test with US, UK, Nigeria
  - [ ] Test with countries using different currencies
  - [ ] Test with countries using different timezones
  - [ ] Verify correct data saves to database

---

## 🔧 **TROUBLESHOOTING**

### **Common Issues:**

#### **Issue 1: Country data not saving**
**Solution:** Make sure you're sending the full country name, not the country code:
```typescript
// ✅ CORRECT
body: { country: 'United States' }

// ❌ WRONG
body: { country: 'US' }
```

#### **Issue 2: Currency/timezone not auto-populating**
**Solution:** The backend handles this automatically. If it's not working:
- Check that the country name exactly matches the database list
- Check server logs for errors
- Verify API response includes these fields

#### **Issue 3: Can't find country in search**
**Solution:** Ensure search is case-insensitive:
```typescript
country.name.toLowerCase().includes(searchTerm.toLowerCase())
```

---

## 📞 **SUPPORT**

**Questions?** Contact the Web App Team

**Database Schema Issues?** Check:
- `DATABASE_SCHEMA_COUNTRY_FIX.sql`
- `ONBOARDING_DATA_FLOW_ANALYSIS.md`

**Web App Reference:**
- `apps/web/src/components/onboarding/CountrySelector.tsx`
- `apps/web/src/components/onboarding/ProfileCompletionWizard.tsx`
- `apps/web/app/api/user/complete-profile/route.ts`

---

## 🚀 **READY TO IMPLEMENT**

The database is already configured to support 200+ countries. The mobile app just needs to:
1. Create the country selector UI
2. Add it to the onboarding flow
3. Send the selected country to the API

All backend logic for currency, timezone, and country code mapping is already in place!

---

**Good luck with the implementation! 🎉**

