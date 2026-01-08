# For Web Team: Event Location System + Notification Webhook

**Date:** January 8, 2026
**From:** Mobile Team
**Priority:** High - Required for event notification system

---

## Overview

This document contains **TWO critical implementations** needed for the events system:

1. **Event Location System** - Intelligent country-based address fields (like mobile app)
2. **Event Notification Webhook** - Automated push notifications to nearby users

**Current Status:**
- ✅ Mobile app has both systems implemented
- ❌ Web app needs both systems implemented
- ⚠️ Backend webhook needs deployment (affects both mobile + web)

---

## PART 1: Event Creation Location System

### What Mobile App Has (Reference Implementation)

The mobile app has an intelligent event creation form that:

1. **Country Selector** - User picks their country first
2. **Dynamic Address Fields** - Form fields change based on country
3. **Geocoding** - Converts address to latitude/longitude
4. **City Extraction** - Extracts city field separately for notifications

### Example: How It Works

**User in UK creates event:**
```
Country: United Kingdom
├── Street Address: 10 Downing Street
├── City/Town: London
├── County: Greater London (optional)
└── Postcode: SW1A 2AA

[Get Coordinates] button → Geocodes to lat/lng
```

**User in US creates event:**
```
Country: United States
├── Street Address: 1600 Pennsylvania Ave NW
├── City: Washington
├── State: DC
└── ZIP Code: 20500

[Get Coordinates] button → Geocodes to lat/lng
```

### Countries Supported (11 Total)

Mobile app supports these countries with custom fields:

1. **United States** - Street, City, State, ZIP Code
2. **United Kingdom** - Street, City/Town, County, Postcode
3. **Canada** - Street, City, Province, Postal Code
4. **Australia** - Street, Suburb, State, Postcode
5. **Nigeria** - Street, City, State, Postal Code
6. **Germany** - Street, City, State/Region, Postal Code
7. **France** - Street, City, Region, Postal Code
8. **India** - Street, City, State, PIN Code
9. **Japan** - Street, City, Prefecture, Postal Code
10. **Brazil** - Street, City, State, CEP
11. **Mexico** - Street, City, State, Postal Code

### Data Sent to Backend

When mobile app creates an event, it sends:

```json
{
  "title": "Amazing Gospel Concert",
  "description": "Join us for worship...",
  "event_date": "2026-02-15T19:00:00.000Z",

  // Location fields (CRITICAL for notifications)
  "location": "10 Downing Street, London, Greater London, SW1A 2AA",
  "city": "London",  // ← REQUIRED for notifications
  "country": "GB",
  "latitude": 51.5034,  // ← Optional but recommended
  "longitude": -0.1276,

  // Event details
  "category": "Gospel Concert",  // ← REQUIRED for notifications
  "venue": "Royal Albert Hall",
  "image_url": "https://...",

  // Pricing
  "is_free": false,
  "price_gbp": 25.00,
  "price_usd": 32.50,
  "price_eur": 28.00,
  "price_ngn": 45000,

  // Structured address data
  "address_data": {
    "country": "GB",
    "fields": {
      "street": "10 Downing Street",
      "city": "London",
      "county": "Greater London",
      "postCode": "SW1A 2AA"
    }
  }
}
```

### Required Implementation for Web App

#### 1. Country Address Configurations

Create a configuration file for country-specific address fields:

```javascript
// config/countryAddressConfigs.js

export const COUNTRY_ADDRESS_CONFIGS = [
  {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Main St', required: true },
      { name: 'city', label: 'City', placeholder: 'New York', required: true },
      { name: 'state', label: 'State', placeholder: 'NY', required: true },
      { name: 'zipCode', label: 'ZIP Code', placeholder: '10001', required: true },
    ]
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '10 Downing Street', required: true },
      { name: 'city', label: 'City/Town', placeholder: 'London', required: true },
      { name: 'county', label: 'County', placeholder: 'Greater London', required: false },
      { name: 'postCode', label: 'Postcode', placeholder: 'SW1A 2AA', required: true },
    ]
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    currency: 'CAD',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Main St', required: true },
      { name: 'city', label: 'City', placeholder: 'Toronto', required: true },
      { name: 'province', label: 'Province', placeholder: 'ON', required: true },
      { name: 'postalCode', label: 'Postal Code', placeholder: 'M5H 2N2', required: true },
    ]
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    currency: 'AUD',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Main St', required: true },
      { name: 'suburb', label: 'Suburb', placeholder: 'Sydney', required: true },
      { name: 'state', label: 'State', placeholder: 'NSW', required: true },
      { name: 'postcode', label: 'Postcode', placeholder: '2000', required: true },
    ]
  },
  {
    countryCode: 'NG',
    countryName: 'Nigeria',
    currency: 'NGN',
    currencySymbol: '₦',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Allen Avenue', required: true },
      { name: 'city', label: 'City', placeholder: 'Lagos', required: true },
      { name: 'state', label: 'State', placeholder: 'Lagos', required: true },
      { name: 'postalCode', label: 'Postal Code', placeholder: '100001', required: false },
    ]
  },
  {
    countryCode: 'DE',
    countryName: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: 'Hauptstraße 1', required: true },
      { name: 'city', label: 'City', placeholder: 'Berlin', required: true },
      { name: 'state', label: 'State/Region', placeholder: 'Berlin', required: true },
      { name: 'postalCode', label: 'Postal Code', placeholder: '10115', required: true },
    ]
  },
  {
    countryCode: 'FR',
    countryName: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '1 Rue de Rivoli', required: true },
      { name: 'city', label: 'City', placeholder: 'Paris', required: true },
      { name: 'region', label: 'Region', placeholder: 'Île-de-France', required: false },
      { name: 'postalCode', label: 'Postal Code', placeholder: '75001', required: true },
    ]
  },
  {
    countryCode: 'IN',
    countryName: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: 'MG Road', required: true },
      { name: 'city', label: 'City', placeholder: 'Mumbai', required: true },
      { name: 'state', label: 'State', placeholder: 'Maharashtra', required: true },
      { name: 'pinCode', label: 'PIN Code', placeholder: '400001', required: true },
    ]
  },
  {
    countryCode: 'JP',
    countryName: 'Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '1-1-1 Chiyoda', required: true },
      { name: 'city', label: 'City', placeholder: 'Tokyo', required: true },
      { name: 'prefecture', label: 'Prefecture', placeholder: 'Tokyo', required: true },
      { name: 'postalCode', label: 'Postal Code', placeholder: '100-0001', required: true },
    ]
  },
  {
    countryCode: 'BR',
    countryName: 'Brazil',
    currency: 'BRL',
    currencySymbol: 'R$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: 'Av. Paulista, 1000', required: true },
      { name: 'city', label: 'City', placeholder: 'São Paulo', required: true },
      { name: 'state', label: 'State', placeholder: 'SP', required: true },
      { name: 'cep', label: 'CEP', placeholder: '01310-100', required: true },
    ]
  },
  {
    countryCode: 'MX',
    countryName: 'Mexico',
    currency: 'MXN',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: 'Av. Reforma 1', required: true },
      { name: 'city', label: 'City', placeholder: 'Mexico City', required: true },
      { name: 'state', label: 'State', placeholder: 'CDMX', required: true },
      { name: 'postalCode', label: 'Postal Code', placeholder: '06600', required: true },
    ]
  }
];

export const DEFAULT_CONFIG = COUNTRY_ADDRESS_CONFIGS[1]; // UK default
```

#### 2. Event Creation Form Component

```jsx
// components/CreateEventForm.jsx (React example - adapt for your framework)

import React, { useState, useEffect } from 'react';
import { COUNTRY_ADDRESS_CONFIGS, DEFAULT_CONFIG } from '../config/countryAddressConfigs';

export default function CreateEventForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    category: '',
    country: 'GB', // Default to UK
    addressFields: {},
    latitude: null,
    longitude: null,
    isFree: true,
    prices: {},
    image_url: '',
  });

  const [selectedCountryConfig, setSelectedCountryConfig] = useState(
    COUNTRY_ADDRESS_CONFIGS.find(c => c.countryCode === 'GB') || DEFAULT_CONFIG
  );

  const [geocoding, setGeocoding] = useState(false);

  // Update country config when country changes
  useEffect(() => {
    const config = COUNTRY_ADDRESS_CONFIGS.find(c => c.countryCode === formData.country);
    setSelectedCountryConfig(config || DEFAULT_CONFIG);
    setFormData(prev => ({ ...prev, addressFields: {} })); // Reset fields
  }, [formData.country]);

  const handleCountryChange = (countryCode) => {
    setFormData(prev => ({ ...prev, country: countryCode }));
  };

  const handleAddressFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      addressFields: {
        ...prev.addressFields,
        [fieldName]: value,
      }
    }));
  };

  // Geocode address to get latitude/longitude
  const geocodeAddress = async () => {
    const addressParts = Object.entries(formData.addressFields)
      .filter(([_, value]) => value.trim())
      .map(([_, value]) => value);

    const fullAddress = addressParts.join(', ') + ', ' + selectedCountryConfig.countryName;

    if (addressParts.length === 0) {
      alert('Please enter address details first');
      return;
    }

    try {
      setGeocoding(true);
      console.log('🌍 Geocoding:', fullAddress);

      // Use Google Maps Geocoding API (you'll need an API key)
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`
      );

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        console.log('✅ Geocoded:', { lat, lng });

        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));

        alert(`Coordinates found: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } else {
        alert('Could not find coordinates. You can still create the event.');
      }
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      alert('Failed to get coordinates. You can still create the event.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Extract city from address fields
    const cityField = formData.addressFields['city'] ||
                     formData.addressFields['suburb'] ||
                     formData.addressFields['town'] || '';

    // Build location string
    const locationParts = Object.entries(formData.addressFields)
      .filter(([_, value]) => value.trim())
      .map(([_, value]) => value);
    const location = locationParts.join(', ');

    // Prepare event data
    const eventData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      event_date: new Date(`${formData.event_date}T${formData.event_time}`).toISOString(),

      // Location data (CRITICAL)
      location: location,
      city: cityField.trim(), // ← REQUIRED for notifications
      country: formData.country,
      latitude: formData.latitude,
      longitude: formData.longitude,

      // Event details
      category: formData.category,
      image_url: formData.image_url,

      // Pricing
      is_free: formData.isFree,
      ...(formData.isFree ? {} : {
        price_usd: parseFloat(formData.prices['USD']) || null,
        price_gbp: parseFloat(formData.prices['GBP']) || null,
        price_eur: parseFloat(formData.prices['EUR']) || null,
        price_ngn: parseFloat(formData.prices['NGN']) || null,
      }),

      // Structured address
      address_data: {
        country: formData.country,
        fields: formData.addressFields,
      }
    };

    console.log('📤 Creating event:', eventData);

    // Call your API
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    if (response.ok) {
      alert('Event created successfully!');
      // Redirect or reset form
    } else {
      const error = await response.json();
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Country Selector */}
      <div>
        <label>Country *</label>
        <select
          value={formData.country}
          onChange={(e) => handleCountryChange(e.target.value)}
          required
        >
          {COUNTRY_ADDRESS_CONFIGS.map(config => (
            <option key={config.countryCode} value={config.countryCode}>
              {config.countryName} ({config.currency})
            </option>
          ))}
        </select>
      </div>

      {/* Dynamic Address Fields */}
      <div>
        <h3>Event Location</h3>
        {selectedCountryConfig.fields.map(field => (
          <div key={field.name}>
            <label>
              {field.label} {field.required && '*'}
            </label>
            <input
              type="text"
              placeholder={field.placeholder}
              value={formData.addressFields[field.name] || ''}
              onChange={(e) => handleAddressFieldChange(field.name, e.target.value)}
              required={field.required}
            />
          </div>
        ))}

        {/* Geocode Button */}
        <button
          type="button"
          onClick={geocodeAddress}
          disabled={geocoding}
        >
          {geocoding ? 'Getting Coordinates...' : 'Get Coordinates'}
        </button>

        {formData.latitude && formData.longitude && (
          <p>
            ✅ Coordinates: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
          </p>
        )}
      </div>

      {/* Other form fields (title, description, category, pricing, etc.) */}
      {/* ... */}

      <button type="submit">Create Event</button>
    </form>
  );
}
```

#### 3. Critical: City Field Extraction

**IMPORTANT:** The `city` field MUST be sent separately (not just in the location string). This is what the notification webhook uses to find nearby users.

```javascript
// Extract city from address fields
// Different countries use different field names
const cityField = addressFields['city'] ||       // US, UK, CA, NG, DE, FR, IN, JP, BR, MX
                 addressFields['suburb'] ||      // AU
                 addressFields['town'] || '';    // Fallback

// Send to backend
const eventData = {
  // ...
  city: cityField.trim(), // ← REQUIRED
  // ...
};
```

---

## PART 2: Event Notification Webhook

### Overview

When an event is created, the system automatically:
1. Finds users in the same city (or within 20km)
2. Filters by user's preferred event categories
3. Checks notification time windows (8 AM - 10 PM default)
4. Enforces daily quota (max 3 event notifications per day)
5. Sends push notifications via Expo
6. Records notification history

### What You've Already Done ✅

You mentioned you ran most SQL from `BACKEND_EVENT_NOTIFICATION_WEBHOOK.md`. Great! Here's what's needed for the parts requiring credentials:

### Deployment Checklist

#### Step 1: Database Schema ✅ (You likely did this)

Verify these columns exist:

```sql
-- Check events table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('city', 'latitude', 'longitude', 'category', 'country');

-- Check profiles table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('city', 'latitude', 'longitude', 'expo_push_token',
                      'event_notifications_enabled', 'preferred_event_categories',
                      'notification_start_hour', 'notification_end_hour');
```

#### Step 2: Deploy Edge Function (Needs Your Credentials)

**Create these files:**

```bash
# In your backend repo
supabase/
  functions/
    send-event-notifications/
      index.ts          # Copy from BACKEND_EVENT_NOTIFICATION_WEBHOOK.md lines 50-269
      _lib/
        expo.ts         # Copy from lines 274-368
        time-window.ts  # Copy from lines 372-431
```

**Deploy:**

```bash
# Deploy Edge Function to Supabase
supabase functions deploy send-event-notifications

# This will output a URL like:
# https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-notifications
```

**Important:** Copy the function URL - you'll need it for the trigger.

#### Step 3: Create Database Trigger (Needs Your Credentials)

Replace the placeholders with your actual values:

```sql
-- Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-notifications';
  service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY';  -- From Supabase Dashboard → Settings → API
BEGIN
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to events table
CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_notifications();
```

**Where to find credentials:**

1. **YOUR_PROJECT_REF**: From your Supabase project URL
   - Example: If URL is `https://abcdefgh.supabase.co`, use `abcdefgh`

2. **YOUR_SERVICE_ROLE_KEY**: Supabase Dashboard
   - Go to: Settings → API → Project API keys
   - Copy "service_role" key (NOT the anon key)
   - ⚠️ Keep this secret - never commit to git

#### Step 4: Testing (After Deployment)

Once the trigger is deployed, test it:

```sql
-- Create a test event (this will trigger the webhook)
INSERT INTO events (
  id, title, description, event_date, location,
  city, latitude, longitude, category, country, creator_id
) VALUES (
  gen_random_uuid(),
  'Test Gospel Concert',
  'Testing notification system',
  NOW() + INTERVAL '7 days',
  'Royal Albert Hall, London, SW1A 2AA',
  'London',  -- ← City field
  51.5009,   -- ← Coordinates
  -0.1773,
  'Gospel Concert',  -- ← Category
  'GB',
  'YOUR_USER_ID'  -- Replace with a real user ID
);

-- Check if notification was sent
SELECT
  nh.sent_at,
  p.username,
  p.city,
  e.title AS event_title
FROM notification_history nh
JOIN profiles p ON p.id = nh.user_id
JOIN events e ON e.id = nh.event_id
WHERE nh.sent_at >= NOW() - INTERVAL '5 minutes'
ORDER BY nh.sent_at DESC;
```

**Expected result:** Users in London with "Gospel Concert" in their `preferred_event_categories` should have entries in `notification_history`.

#### Step 5: Set Up Test Users (For Testing)

To test notifications, you need users with push tokens. Here's how to set up test users:

```sql
-- Update a test user's notification preferences
-- Replace 'ACTUAL_USER_ID' with a real user ID from your profiles table
UPDATE profiles
SET
  city = 'London',
  latitude = 51.5074,
  longitude = -0.1278,
  event_notifications_enabled = TRUE,
  preferred_event_categories = ARRAY['Gospel Concert', 'Music Concert'],
  notification_start_hour = 8,
  notification_end_hour = 22
WHERE id = 'ACTUAL_USER_ID';

-- The expo_push_token will be set automatically when the user logs into the mobile app
-- You can check if it's set:
SELECT id, username, city, expo_push_token, preferred_event_categories
FROM profiles
WHERE id = 'ACTUAL_USER_ID';
```

**Note:** The mobile app automatically registers push tokens when users log in. You can't manually create valid push tokens - they must come from a real device.

---

## PART 3: Backend API Requirements

### Events API Endpoint

Your backend API should accept the event data format described above. Here's what needs to be stored:

**Required fields:**
- `title`, `description`, `event_date`
- `city` ← CRITICAL for notifications
- `category` ← CRITICAL for notifications
- `country`

**Optional but recommended:**
- `latitude`, `longitude` ← Enables 20km radius matching
- `location` ← Full address string for display
- `address_data` ← Structured address for future use

**Example API endpoint (Next.js/Node.js):**

```javascript
// pages/api/events.js (or your framework equivalent)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    title,
    description,
    event_date,
    location,
    city,      // ← REQUIRED
    country,
    latitude,
    longitude,
    category,  // ← REQUIRED
    image_url,
    is_free,
    price_usd,
    price_gbp,
    price_eur,
    price_ngn,
    address_data,
  } = req.body;

  // Validate required fields
  if (!title || !description || !event_date || !category) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!city && !latitude) {
    return res.status(400).json({
      error: 'Either city or coordinates (latitude/longitude) are required for notifications'
    });
  }

  // Get authenticated user
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Insert into database (Supabase example)
    const { data: event, error } = await supabase
      .from('events')
      .insert([{
        creator_id: user.id,
        title,
        description,
        event_date,
        location,
        city,
        country,
        latitude,
        longitude,
        category,
        image_url,
        is_free,
        price_usd,
        price_gbp,
        price_eur,
        price_ngn,
        address_data,
      }])
      .select()
      .single();

    if (error) throw error;

    // The database trigger will automatically call the notification webhook
    // No need to manually trigger it here

    return res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({
      error: 'Failed to create event',
      message: error.message,
    });
  }
}
```

---

## PART 4: Multi-Currency Pricing (Optional but Recommended)

The mobile app supports pricing in multiple currencies. If you want to match this:

```jsx
// Pricing section in your form

const [isFree, setIsFree] = useState(true);
const [prices, setPrices] = useState({
  USD: '',
  GBP: '',
  EUR: '',
  NGN: '',
});

// In your form
<div>
  <label>
    <input
      type="checkbox"
      checked={isFree}
      onChange={(e) => setIsFree(e.target.checked)}
    />
    Free Event
  </label>
</div>

{!isFree && (
  <div>
    <h4>Pricing (set prices in different currencies)</h4>

    <div>
      <label>USD ($)</label>
      <input
        type="number"
        step="0.01"
        value={prices.USD}
        onChange={(e) => setPrices({ ...prices, USD: e.target.value })}
        placeholder="0.00"
      />
    </div>

    <div>
      <label>GBP (£)</label>
      <input
        type="number"
        step="0.01"
        value={prices.GBP}
        onChange={(e) => setPrices({ ...prices, GBP: e.target.value })}
        placeholder="0.00"
      />
    </div>

    <div>
      <label>EUR (€)</label>
      <input
        type="number"
        step="0.01"
        value={prices.EUR}
        onChange={(e) => setPrices({ ...prices, EUR: e.target.value })}
        placeholder="0.00"
      />
    </div>

    <div>
      <label>NGN (₦)</label>
      <input
        type="number"
        step="0.01"
        value={prices.NGN}
        onChange={(e) => setPrices({ ...prices, NGN: e.target.value })}
        placeholder="0.00"
      />
    </div>
  </div>
)}
```

---

## Summary Checklist

### For Web App Team:

**Event Creation Form:**
- [ ] Implement country selector
- [ ] Implement dynamic address fields (11 countries)
- [ ] Add geocoding button to get coordinates
- [ ] Extract city field separately
- [ ] Send all required fields to backend API

**Backend Deployment:**
- [x] Database schema verified (you did this)
- [x] Database functions created (you did this)
- [ ] Deploy Edge Function to Supabase
- [ ] Create database trigger with YOUR credentials
- [ ] Test with real event creation

**Testing:**
- [ ] Create test event via web app
- [ ] Verify notification sent to mobile users
- [ ] Check notification_history table
- [ ] Test daily quota (3/day limit)
- [ ] Test time window (8 AM - 10 PM)

---

## Files to Reference

1. **BACKEND_EVENT_NOTIFICATION_WEBHOOK.md** - Complete webhook implementation
2. **EVENT_NOTIFICATION_SYSTEM_STATUS.md** - System status and testing guide
3. **EVENT_NOTIFICATION_DEPLOYMENT_CHECKLIST.md** - Detailed deployment steps

---

## Questions?

If you have any questions about:
- Country address configurations
- Geocoding implementation
- Backend API structure
- Notification webhook deployment

Please reach out to the mobile team. We're happy to help!

---

**Mobile App Reference:**
- See: `src/screens/CreateEventScreen.tsx` (lines 29-181 for country configs)
- See: `src/screens/CreateEventScreen.tsx` (lines 300-350 for geocoding)
- See: `src/screens/CreateEventScreen.tsx` (lines 476-489 for city extraction)

**Status:** Ready for web team implementation
**Priority:** High - Required for event notifications to work
**Estimated Time:** 4-6 hours for event creation form + 2 hours for webhook deployment
