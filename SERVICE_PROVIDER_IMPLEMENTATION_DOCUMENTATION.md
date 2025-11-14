# Service Provider Implementation Documentation

**Last Updated:** December 12, 2024  
**Status:** ✅ Fully Implemented  
**Platform:** Mobile App (React Native/Expo)

---

## Table of Contents

1. [Overview](#overview)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend API Endpoints](#backend-api-endpoints)
4. [Data Structures](#data-structures)
5. [Authentication](#authentication)
6. [UI/UX Implementation](#uiux-implementation)
7. [Workflow & User Journey](#workflow--user-journey)
8. [Error Handling](#error-handling)
9. [Testing Checklist](#testing-checklist)

---

## Overview

The Service Provider feature allows creators to offer professional audio services (mixing, mastering, sound engineering, etc.) to clients through the SoundBridge platform. This document provides comprehensive details for both frontend and backend teams.

### Key Features

- ✅ **Profile Management** - Create and update service provider profiles
- ✅ **Service Offerings** - CRUD operations for service offerings
- ✅ **Portfolio** - Upload and manage portfolio items (videos, audio samples)
- ✅ **Availability** - Manage availability slots for bookings
- ✅ **Bookings** - View and manage client bookings
- ✅ **Verification** - Submit verification requests with prerequisites
- ✅ **Badges** - View badge insights and progress
- ✅ **Reviews** - View client reviews and ratings

---

## Frontend Implementation

### File Structure

```
src/
├── screens/
│   ├── ServiceProviderDashboardScreen.tsx    # Main dashboard (8 sections)
│   └── ServiceProviderOnboardingScreen.tsx   # Initial profile setup
├── services/
│   └── creatorExpansionService.ts            # API service layer
├── components/
│   └── BackButton.tsx                        # Reusable back button
└── types/
    └── index.ts                              # TypeScript type definitions
```

### Main Components

#### 1. ServiceProviderDashboardScreen

**Location:** `src/screens/ServiceProviderDashboardScreen.tsx`

**Purpose:** Main dashboard displaying all 8 sections of service provider features.

**Sections:**
1. **Badges** - Current badge tier, stats, next milestone
2. **Verification** - Prerequisites checklist, submission form, status
3. **Profile** - Display name, headline, bio, categories, default rate
4. **Bookings** - List of bookings with status actions
5. **Offerings** - CRUD for service offerings
6. **Portfolio** - Video/audio portfolio items
7. **Availability** - Availability slots management
8. **Reviews** - Client reviews and ratings

**Key State Variables:**
```typescript
const [profile, setProfile] = useState<ServiceProviderProfileResponse | null>(null);
const [bookings, setBookings] = useState<ServiceBooking[]>([]);
const [badgeInsights, setBadgeInsights] = useState<BadgeInsights | null>(null);
const [verificationStatus, setVerificationStatus] = useState<VerificationStatusResponse | null>(null);
const [availability, setAvailability] = useState<ServiceProviderAvailability[]>([]);
const [reviews, setReviews] = useState<ServiceReview[]>([]);
const [showOfferingForm, setShowOfferingForm] = useState(false);
const [showPortfolioForm, setShowPortfolioForm] = useState(false);
const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
```

**Navigation:**
- Accessed via: Profile Screen → Settings Tab → "Service Provider Dashboard" button
- Uses route params: `{ userId: string }`
- Falls back to current user's ID if not provided

#### 2. ServiceProviderOnboardingScreen

**Location:** `src/screens/ServiceProviderOnboardingScreen.tsx`

**Purpose:** Initial profile setup for new service providers.

**Form Fields:**
- Display Name (required)
- Headline (optional)
- Bio (optional)
- Categories (multi-select)
- Default Rate (optional)
- Rate Currency (USD, GBP, EUR, NGN - expanded to 40+ currencies)

**Navigation:**
- Accessed via: "Become a Service Provider" button in Profile → Settings
- Redirects to Dashboard after successful creation

---

## Backend API Endpoints

### Base URL

**Production:** `https://www.soundbridge.live`  
**Note:** Must use `www.soundbridge.live` (not `soundbridge.live` or `app.soundbridge.fm`)

### Authentication

**Method:** Bearer Token Authentication  
**Header:** `Authorization: Bearer {access_token}`

**Important:** Use ONLY the `Authorization` header (per web team recommendation). Do not send multiple auth headers.

### Endpoints

#### 1. Creator Type Management

**GET** `/api/users/{userId}/creator-types`
- **Purpose:** Fetch user's creator types
- **Auth:** Required
- **Response:**
```json
{
  "creatorTypes": ["musician", "service_provider"]
}
```

**POST** `/api/users/{userId}/creator-types`
- **Purpose:** Update creator types (full replacement)
- **Auth:** Required
- **Request Body:**
```json
{
  "creatorTypes": ["musician", "service_provider"]
}
```
- **Response:**
```json
{
  "success": true,
  "creatorTypes": ["musician", "service_provider"]
}
```

#### 2. Service Provider Profile

**GET** `/api/service-providers/{userId}?include=offerings,portfolio,reviews,availability`
- **Purpose:** Fetch service provider profile with related data
- **Auth:** Optional (public profiles visible if `status='active'`)
- **Query Parameters:**
  - `include` - Comma-separated list: `offerings`, `portfolio`, `reviews`, `availability`
- **Response Structure:**
```json
{
  "provider": {
    "user_id": "string",
    "display_name": "string",
    "headline": "string | null",
    "bio": "string | null",
    "categories": ["sound_engineering", "mixing_mastering"],
    "default_rate": 150.00,
    "rate_currency": "USD",
    "status": "draft" | "pending_review" | "active" | "suspended",
    "is_verified": false,
    "verification_status": "not_requested" | "pending" | "approved" | "rejected",
    "created_at": "ISO 8601",
    "updated_at": "ISO 8601"
  },
  "offerings": [...],
  "portfolio": [...],
  "availability": [...],
  "reviews": [...]
}
```
- **Error Handling:**
  - `404` - Profile doesn't exist (return `null` in mobile app)
  - `401` - Authentication required (for private profiles)

**POST** `/api/service-providers`
- **Purpose:** Create or update service provider profile
- **Auth:** Required
- **Request Body:**
```json
{
  "displayName": "John's Audio Services",
  "headline": "Professional Mixing & Mastering",
  "bio": "10 years of experience...",
  "categories": ["mixing_mastering", "sound_engineering"],
  "defaultRate": 150.00,
  "rateCurrency": "USD"
}
```
- **Response:** `ServiceProviderProfileResponse`

#### 3. Service Offerings

**GET** `/api/service-providers/{userId}/offerings`
- **Purpose:** List all offerings (included in main profile endpoint)
- **Auth:** Optional

**POST** `/api/service-providers/{userId}/offerings`
- **Purpose:** Create new offering
- **Auth:** Required (must be owner)
- **Request Body:**
```json
{
  "title": "Full Mix & Master",
  "category": "mixing_mastering",
  "rate_amount": 200.00,
  "rate_currency": "USD",
  "rate_unit": "per_track",
  "description": "Professional mixing and mastering...",
  "is_active": true
}
```

**PATCH** `/api/service-providers/{userId}/offerings/{offeringId}`
- **Purpose:** Update existing offering
- **Auth:** Required (must be owner)
- **Request Body:** Same as POST

**DELETE** `/api/service-providers/{userId}/offerings/{offeringId}`
- **Purpose:** Delete offering
- **Auth:** Required (must be owner)
- **Response:** `204 No Content`

#### 4. Portfolio

**POST** `/api/service-providers/{userId}/portfolio`
- **Purpose:** Add portfolio item
- **Auth:** Required (must be owner)
- **Request Body:**
```json
{
  "media_url": "https://...",
  "thumbnail_url": "https://...",
  "caption": "Sample work",
  "display_order": 0
}
```

**DELETE** `/api/service-providers/{userId}/portfolio/{itemId}`
- **Purpose:** Delete portfolio item
- **Auth:** Required (must be owner)
- **Response:** `204 No Content`

#### 5. Availability

**POST** `/api/service-providers/{userId}/availability`
- **Purpose:** Add availability slot
- **Auth:** Required (must be owner)
- **Request Body:**
```json
{
  "start_time": "2024-12-15T10:00:00Z",
  "end_time": "2024-12-15T14:00:00Z",
  "recurrence": "none" | "daily" | "weekly" | "monthly",
  "is_bookable": true
}
```

**DELETE** `/api/service-providers/{userId}/availability/{availabilityId}`
- **Purpose:** Delete availability slot
- **Auth:** Required (must be owner)
- **Response:** `204 No Content`

#### 6. Bookings

**GET** `/api/service-providers/{userId}/bookings`
- **Purpose:** List provider bookings
- **Auth:** Required (must be owner)
- **Response Structure:**
```json
{
  "bookings": [
    {
      "id": "string",
      "provider_id": "string",
      "booker_id": "string",
      "service_offering_id": "string | null",
      "venue_id": "string | null",
      "status": "pending" | "confirmed_awaiting_payment" | "paid" | "completed" | "cancelled" | "disputed",
      "scheduled_start": "ISO 8601",
      "scheduled_end": "ISO 8601",
      "timezone": "string",
      "total_amount": 200.00,
      "currency": "USD",
      "platform_fee": 20.00,
      "provider_payout": 180.00,
      "booking_notes": "string | null",
      "confirmed_at": "ISO 8601 | null",
      "paid_at": "ISO 8601 | null",
      "completed_at": "ISO 8601 | null",
      "cancelled_at": "ISO 8601 | null",
      "created_at": "ISO 8601",
      "booker": {
        "id": "string",
        "display_name": "string | null",
        "username": "string | null",
        "avatar_url": "string | null"
      },
      "offering": {
        "id": "string",
        "title": "string",
        "category": "string",
        "rate_amount": 200.00,
        "rate_currency": "USD",
        "rate_unit": "per_track"
      } | null,
      "venue": {
        "id": "string",
        "name": "string",
        "address": {}
      } | null
    }
  ]
}
```

**PATCH** `/api/service-providers/{userId}/bookings?bookingId={bookingId}`
- **Purpose:** Update booking status
- **Auth:** Required (must be owner)
- **Request Body:**
```json
{
  "status": "confirmed_awaiting_payment" | "completed" | "cancelled",
  "notes": "Optional notes"
}
```

#### 7. Verification

**GET** `/api/service-providers/{userId}/verification/status`
- **Purpose:** Get verification status and prerequisites
- **Auth:** Optional (403 if not owner/admin)
- **Response Structure:**
```json
{
  "status": {
    "verificationStatus": "not_requested" | "pending" | "approved" | "rejected",
    "prerequisites": {
      "completeProfile": {
        "met": true,
        "required": true,
        "value": true
      },
      "activeOffering": {
        "met": true,
        "required": true,
        "value": true
      },
      "portfolioItems": {
        "met": false,
        "required": true,
        "value": 0
      },
      "completedBookings": {
        "met": false,
        "required": false,
        "value": 0
      },
      "averageRating": {
        "met": false,
        "required": false,
        "value": null
      },
      "connectAccount": {
        "met": false,
        "required": true,
        "value": false
      }
    }
  }
}
```

**POST** `/api/service-providers/{userId}/verification/request`
- **Purpose:** Submit verification request
- **Auth:** Required (must be owner)
- **Request Body:**
```json
{
  "governmentIdUrl": "https://...",
  "selfieUrl": "https://...",
  "businessDocUrl": "https://...",
  "notes": "Optional notes"
}
```

#### 8. Badges

**GET** `/api/service-providers/{userId}/badges`
- **Purpose:** Get badge insights
- **Auth:** Required (must be owner)
- **Response Structure:**
```json
{
  "insights": {
    "badgeTier": "new" | "rising" | "top_rated",
    "badges": [
      {
        "tier": "string",
        "label": "string",
        "description": "string",
        "isCurrent": true,
        "unlockedAt": "ISO 8601 | null",
        "createdAt": "ISO 8601"
      }
    ],
    "nextBadge": {
      "tier": "string",
      "label": "string",
      "description": "string",
      "requirements": [
        {
          "id": "string",
          "label": "string",
          "current": 5,
          "target": 10,
          "met": false
        }
      ]
    } | null,
    "completedBookings": 5,
    "averageRating": 4.5,
    "reviewCount": 10,
    "idVerified": false,
    "firstBookingDiscountEligible": true,
    "firstBookingDiscountPercent": 10
  }
}
```

#### 9. Reviews

**GET** `/api/service-providers/{userId}/reviews`
- **Purpose:** Get provider reviews (included in main profile endpoint via `include=reviews`)
- **Auth:** Optional
- **Response:** Reviews are included in main profile endpoint response

---

## Data Structures

### ServiceProviderProfile

```typescript
interface ServiceProviderProfile {
  user_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  categories: ServiceCategory[];
  default_rate: number | null;
  rate_currency: string | null;
  status: 'draft' | 'pending_review' | 'active' | 'suspended';
  is_verified: boolean;
  verification_status: 'not_requested' | 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}
```

### ServiceOffering

```typescript
interface ServiceOffering {
  id: string;
  provider_id: string;
  title: string;
  category: ServiceCategory;
  description: string | null;
  rate_amount: number;
  rate_currency: string;
  rate_unit: 'per_hour' | 'per_track' | 'per_project' | 'fixed';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### ServiceCategory

```typescript
type ServiceCategory =
  | 'sound_engineering'
  | 'mixing_mastering'
  | 'music_production'
  | 'audio_editing'
  | 'vocal_tuning'
  | 'sound_design'
  | 'audio_restoration'
  | 'podcast_production'
  | 'live_sound'
  | 'consulting';
```

### Supported Currencies

**40+ currencies supported** via `CurrencyService`:
- **Americas:** USD, CAD, MXN, BRL, ARS, CLP, COP, PEN
- **Europe:** EUR, GBP, CHF, SEK, NOK, DKK, PLN, RUB, TRY, CZK, HUF, RON, BGN, HRK
- **Asia-Pacific:** JPY, CNY, AUD, NZD, SGD, HKD, KRW, THB, MYR, PHP, IDR, VND, INR
- **Middle East & Africa:** AED, SAR, ILS, NGN, GHS, KES, EGP, ZAR

### ServiceBooking

```typescript
interface ServiceBooking {
  id: string;
  provider_id: string;
  booker_id: string;
  service_offering_id: string | null;
  venue_id: string | null;
  status: 'pending' | 'confirmed_awaiting_payment' | 'paid' | 'completed' | 'cancelled' | 'disputed';
  scheduled_start: string; // ISO 8601
  scheduled_end: string; // ISO 8601
  timezone: string;
  total_amount: number;
  currency: string;
  platform_fee: number;
  provider_payout: number;
  booking_notes: string | null;
  confirmed_at: string | null;
  paid_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  booker: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  offering: {
    id: string;
    title: string;
    category: string;
    rate_amount: number;
    rate_currency: string;
    rate_unit: string;
  } | null;
  venue: {
    id: string;
    name: string;
    address: Record<string, unknown> | null;
  } | null;
}
```

### VerificationStatusResponse

```typescript
interface VerificationStatusResponse {
  provider_id: string;
  status: 'not_requested' | 'pending' | 'approved' | 'rejected';
  requested_at?: string | null;
  reviewed_at?: string | null;
  reviewer?: {
    id: string;
    name?: string | null;
  } | null;
  prerequisites: {
    [key: string]: {
      met: boolean;
      required: boolean;
      value: any;
    };
  };
}
```

**Prerequisites Keys:**
- `completeProfile` - Profile is complete
- `activeOffering` - Has at least one active offering
- `portfolioItems` - Has portfolio items
- `completedBookings` - Has completed bookings
- `averageRating` - Has minimum average rating
- `connectAccount` - Has connected payment account

### BadgeInsights

```typescript
interface BadgeInsights {
  badgeTier: 'new' | 'rising' | 'top_rated';
  badges: Array<{
    tier: string;
    label: string;
    description: string;
    isCurrent: boolean;
    unlockedAt: string | null;
    createdAt: string;
  }>;
  nextBadge: {
    tier: string;
    label: string;
    description: string;
    requirements: Array<{
      id: string;
      label: string;
      current: number;
      target: number;
      met: boolean;
    }>;
  } | null;
  completedBookings: number;
  averageRating: number;
  reviewCount: number;
  idVerified: boolean;
  firstBookingDiscountEligible: boolean;
  firstBookingDiscountPercent: number | null;
}
```

---

## Authentication

### Mobile App Authentication

**Method:** Bearer Token Authentication  
**Header:** `Authorization: Bearer {access_token}`

**Implementation:**
```typescript
// src/lib/apiClient.ts
const mergedHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};

if (token) {
  mergedHeaders['Authorization'] = `Bearer ${token}`;
}
```

**Token Source:**
- From Supabase session: `session.access_token`
- Token length: ~878 characters (JWT)
- Token format: Starts with `eyJ` (base64 encoded JSON)

### Special Cases

**Cookie Authentication:**
Some endpoints (like `/api/users/{userId}/preferences`) require Cookie authentication:

```typescript
function buildSupabaseCookie(session: Session | null) {
  if (!session?.access_token) return undefined;
  const parts = [`sb-access-token=${session.access_token}`];
  if (session.refresh_token) {
    parts.push(`sb-refresh-token=${session.refresh_token}`);
  }
  return parts.join('; ');
}

// Usage
const cookie = buildSupabaseCookie(session);
const data = await apiFetch('/api/users/${userId}/preferences', {
  headers: cookie ? { Cookie: cookie } : undefined,
  session,
});
```

**Note:** When Cookie header is present, `apiClient` preserves it and also includes Bearer token.

---

## UI/UX Implementation

### Design System

**Theme:** Dark theme with purple/magenta gradients matching web app

**Colors:**
- Background: `#121828`
- Surface: `#1A1F2E`
- Card: `#252938`
- Primary: `#DC2626` (red)
- Accent Purple: `#8B5CF6`
- Text: `#FFFFFF`
- Text Secondary: `#9CA3AF`
- Border: `rgba(255, 255, 255, 0.1)`

**Glassmorphism:**
- Background: `rgba(255, 255, 255, 0.05)`
- Backdrop blur: `blur(20px)`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Border radius: `12px` - `20px`

**Gradients:**
- Primary buttons: `['#DC2626', '#EC4899']`
- Verification: `['#DC2626', '#EC4899']`
- Offerings: `['#f97316', '#fb7185']`

### Components

#### Currency Picker Modal

**Implementation:**
- Modal with scrollable list of currencies
- Shows currency code, name, and symbol
- Highlights selected currency
- Closes on selection

**Usage:**
```typescript
<TouchableOpacity
  style={styles.pickerContainer}
  onPress={() => setShowCurrencyPicker(true)}
>
  <Text>{offeringForm.rate_currency} - {currencyService.getCurrencyName(offeringForm.rate_currency)}</Text>
  <Ionicons name="chevron-down" size={16} />
</TouchableOpacity>
```

#### Back Button

**Component:** `src/components/BackButton.tsx`

**Features:**
- Consistent styling across screens
- Handles navigation gracefully
- Falls back to Profile screen if can't go back

**Usage:**
```typescript
<BackButton onPress={() => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate('Profile');
  }
}} />
```

### Loading States

**Dashboard Loading:**
- Shows header with back button
- Displays loading spinner
- Prevents UI freeze

**Error States:**
- 404: Redirects to onboarding
- 401: Shows authentication error with retry
- Network errors: Shows network error message

---

## Workflow & User Journey

### 1. Becoming a Service Provider

**Step 1:** User clicks "Become a Service Provider" button in Profile → Settings

**Step 2:** `becomeServiceProvider()` function:
- Fetches current creator types
- Adds `'service_provider'` to types
- Updates via `POST /api/users/{userId}/creator-types`

**Step 3:** Navigate to `ServiceProviderOnboardingScreen`

**Step 4:** User fills out profile form:
- Display Name (required)
- Headline (optional)
- Bio (optional)
- Categories (multi-select)
- Default Rate (optional)
- Rate Currency (picker with 40+ options)

**Step 5:** Submit profile:
- Calls `POST /api/service-providers`
- On success: Navigate to Dashboard
- On error: Show error alert

### 2. Dashboard Usage

**Loading:**
1. Check if `userId` and `session` exist
2. Load data concurrently using `Promise.allSettled`:
   - Profile (with offerings, portfolio, reviews, availability)
   - Bookings
   - Badge insights
   - Verification status
   - Reviews
3. Handle individual failures gracefully
4. Show loading spinner with header

**Sections:**

**Badges:**
- Display current tier
- Show stats (bookings, rating, reviews)
- Show next badge requirements

**Verification:**
- Display prerequisites checklist
- Convert API object format to array for UI
- Show submission form if prerequisites met
- Display status badge (approved/pending/rejected)

**Profile:**
- Display profile information
- "Edit" button navigates to onboarding screen

**Bookings:**
- List all bookings
- Show status badges with colors
- Action buttons: Confirm, Decline, Complete, Cancel
- Update status via `PATCH /api/service-providers/{userId}/bookings`

**Offerings:**
- List all offerings
- "Add Offering" button opens form
- Edit/Delete actions for each offering
- Currency picker modal for selection

**Portfolio:**
- Display portfolio items
- "Add Portfolio Item" button
- Delete action for each item
- Video modal for viewing

**Availability:**
- List availability slots
- "Add Availability" button
- Delete action for each slot

**Reviews:**
- Display client reviews
- Show rating stars
- Display comments and dates

### 3. Error Handling

**404 - Profile Not Found:**
- Show alert: "Profile Not Found"
- Options: "Set Up Profile" (navigate to onboarding) or "Cancel" (go back)

**401 - Authentication Failed:**
- Show alert with specific message
- Options: "Go Back" or "Retry"
- Check `navigation.canGoBack()` before calling `goBack()`

**Network Errors:**
- Detect network failures
- Show user-friendly message
- Provide retry option

---

## Error Handling

### API Error Responses

**Format:**
```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

### Common Error Scenarios

#### 401 Unauthorized
**Causes:**
- Missing or invalid token
- Token expired
- Token format incorrect

**Mobile App Handling:**
- Show alert: "Authentication failed. Your session may have expired. Please sign in again."
- Provide "Go Back" and "Retry" options
- Log token presence and length for debugging

#### 403 Forbidden
**Causes:**
- Authenticated user doesn't match `userId` in URL
- Trying to access another user's private data

**Mobile App Handling:**
- Show alert: "Access forbidden. You may not have permission to perform this action."
- Navigate back or to Profile screen

#### 404 Not Found
**Causes:**
- User doesn't have a service provider profile yet
- Profile was deleted
- Resource doesn't exist

**Mobile App Handling:**
- For profile: Redirect to onboarding
- For other resources: Show empty state or error message

#### Network Errors
**Causes:**
- No internet connection
- Request timeout
- Server unreachable

**Mobile App Handling:**
- Detect network errors specifically
- Show message: "Network request failed. Please check your internet connection and try again."
- Provide retry option

---

## Testing Checklist

### Authentication
- [ ] Valid token: All endpoints return 200
- [ ] Invalid token: Returns 401
- [ ] Expired token: Returns 401
- [ ] Missing token: Returns 401
- [ ] Token refresh: Works correctly

### Profile Management
- [ ] Create profile: Successfully creates
- [ ] Update profile: Successfully updates
- [ ] Profile doesn't exist: Returns 404, redirects to onboarding
- [ ] Profile exists: Loads correctly

### Offerings
- [ ] Create offering: Successfully creates
- [ ] Update offering: Successfully updates
- [ ] Delete offering: Successfully deletes
- [ ] Currency picker: Opens modal, selects currency correctly
- [ ] Form validation: Required fields enforced

### Portfolio
- [ ] Add portfolio item: Successfully adds
- [ ] Delete portfolio item: Successfully deletes
- [ ] Video modal: Opens and displays correctly

### Availability
- [ ] Add availability slot: Successfully adds
- [ ] Delete availability slot: Successfully deletes
- [ ] Date/time validation: End > Start

### Bookings
- [ ] List bookings: Returns correct list
- [ ] Update booking status: Successfully updates
- [ ] Status actions: Confirm, Decline, Complete, Cancel work

### Verification
- [ ] Load verification status: Returns prerequisites object
- [ ] Prerequisites display: Converts object to array correctly
- [ ] Submit verification: Successfully submits
- [ ] Prerequisites met: Form enabled
- [ ] Prerequisites not met: Form disabled

### Badges
- [ ] Load badge insights: Returns insights object
- [ ] Badge tier display: Shows correctly
- [ ] Next badge requirements: Displays correctly

### Reviews
- [ ] Load reviews: Returns reviews array
- [ ] Review display: Shows rating, comment, date correctly

### UI/UX
- [ ] Loading states: Show spinner, don't freeze UI
- [ ] Error states: Show appropriate messages
- [ ] Empty states: Show helpful messages
- [ ] Pull-to-refresh: Works correctly
- [ ] Navigation: Back button works, can navigate away
- [ ] Currency picker: Modal opens, selects, closes correctly
- [ ] Dark theme: Colors match web app
- [ ] Glassmorphism: Effects applied correctly

---

## Frontend Code Examples

### Loading Dashboard Data

```typescript
const loadDashboardData = async () => {
  if (!userId || !session) {
    Alert.alert('Error', 'Unable to load dashboard. Please sign in again.');
    return;
  }

  setLoading(true);
  try {
    const [profileData, bookingsData, badgeData, verificationData, reviewsData] = 
      await Promise.allSettled([
        fetchServiceProviderProfile(userId, ['offerings', 'portfolio', 'reviews', 'availability'], { session }),
        fetchProviderBookings(userId, { session }),
        fetchBadgeInsights(userId, { session }),
        fetchVerificationStatus(userId, { session }),
        fetchProviderReviews(userId, { session }),
      ]);

    // Handle each result individually
    if (profileData.status === 'fulfilled' && profileData.value) {
      setProfile(profileData.value);
      setAvailability(profileData.value.availability || []);
    } else if (profileData.reason?.status === 404) {
      // Redirect to onboarding
      Alert.alert('Profile Not Found', 'You need to set up your service provider profile first.', [
        { text: 'Set Up Profile', onPress: () => navigation.navigate('ServiceProviderOnboarding') },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    // Handle other data...
  } catch (error) {
    // Error handling...
  } finally {
    setLoading(false);
  }
};
```

### Creating an Offering

```typescript
const handleSaveOffering = async () => {
  if (!session) return;

  try {
    if (editingOffering) {
      await updateServiceOffering(userId, editingOffering.id, offeringForm, { session });
    } else {
      await createServiceOffering(userId, offeringForm, { session });
    }
    
    await loadDashboardData();
    setShowOfferingForm(false);
    setEditingOffering(null);
    setOfferingForm({
      title: '',
      category: 'sound_engineering',
      rate_amount: 0,
      rate_currency: 'USD',
      rate_unit: 'per_hour',
      is_active: true,
    });
  } catch (error) {
    Alert.alert('Error', 'Failed to save offering');
  }
};
```

### Currency Picker

```typescript
// State
const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

// In form
<TouchableOpacity
  style={styles.pickerContainer}
  onPress={() => setShowCurrencyPicker(true)}
>
  <Text>{offeringForm.rate_currency} - {currencyService.getCurrencyName(offeringForm.rate_currency)}</Text>
  <Ionicons name="chevron-down" size={16} />
</TouchableOpacity>

// Modal
<Modal visible={showCurrencyPicker} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={styles.currencyModalContent}>
      <View style={styles.modalHeader}>
        <Text>Select Currency</Text>
        <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
          <Ionicons name="close" size={24} />
        </TouchableOpacity>
      </View>
      <ScrollView>
        {SUPPORTED_CURRENCIES.map((currency) => {
          const currencyInfo = currencyService.getCurrencyInfo(currency);
          const isSelected = offeringForm.rate_currency === currency;
          return (
            <TouchableOpacity
              key={currency}
              style={[styles.currencyOption, isSelected && styles.selected]}
              onPress={() => {
                setOfferingForm((prev) => ({ ...prev, rate_currency: currency }));
                setShowCurrencyPicker(false);
              }}
            >
              <Text>{currency} - {currencyInfo.name} ({currencyInfo.symbol})</Text>
              {isSelected && <Ionicons name="checkmark-circle" />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  </View>
</Modal>
```

---

## Backend Requirements

### API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/users/{userId}/creator-types` | GET | Required | Get creator types |
| `/api/users/{userId}/creator-types` | POST | Required | Update creator types |
| `/api/service-providers/{userId}` | GET | Optional | Get profile |
| `/api/service-providers` | POST | Required | Create/update profile |
| `/api/service-providers/{userId}/offerings` | POST | Required | Create offering |
| `/api/service-providers/{userId}/offerings/{id}` | PATCH | Required | Update offering |
| `/api/service-providers/{userId}/offerings/{id}` | DELETE | Required | Delete offering |
| `/api/service-providers/{userId}/portfolio` | POST | Required | Add portfolio item |
| `/api/service-providers/{userId}/portfolio/{id}` | DELETE | Required | Delete portfolio item |
| `/api/service-providers/{userId}/availability` | POST | Required | Add availability |
| `/api/service-providers/{userId}/availability/{id}` | DELETE | Required | Delete availability |
| `/api/service-providers/{userId}/bookings` | GET | Required | List bookings |
| `/api/service-providers/{userId}/bookings` | PATCH | Required | Update booking status |
| `/api/service-providers/{userId}/verification/status` | GET | Optional | Get verification status |
| `/api/service-providers/{userId}/verification/request` | POST | Required | Submit verification |
| `/api/service-providers/{userId}/badges` | GET | Required | Get badge insights |
| `/api/service-providers/{userId}/reviews` | GET | Optional | Get reviews (via include) |

### Response Wrapping

**Important:** API responses are wrapped in objects:

- Profile: `{ provider: ..., offerings?: ..., portfolio?: ..., availability?: ..., reviews?: ... }`
- Bookings: `{ bookings: ServiceBooking[] }`
- Badges: `{ insights: BadgeInsights }`
- Verification: `{ status: { verificationStatus: ..., prerequisites: {...} } }`

**Mobile app transforms these** to match expected types.

### Authentication Requirements

**Bearer Token:**
- Header: `Authorization: Bearer {token}`
- Use ONLY this header (per web team recommendation)
- Token from Supabase session: `session.access_token`

**Cookie Authentication:**
- Some endpoints require Cookie header
- Format: `sb-access-token={token}; sb-refresh-token={refresh_token}`
- Used for: `/api/users/{userId}/preferences` and similar endpoints

### Error Responses

**Format:**
```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `204` - No Content (for DELETE)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## Key Implementation Notes

### 1. Response Structure Handling

**API returns wrapped objects, mobile app transforms:**

```typescript
// API Response
{
  provider: { ... },
  offerings: [...],
  portfolio: [...]
}

// Mobile app transforms to:
{
  ...provider,
  offerings: [...],
  portfolio: [...]
}
```

### 2. Prerequisites Object Handling

**API returns object, mobile app converts to array:**

```typescript
// API Response
{
  status: {
    prerequisites: {
      completeProfile: { met: true, required: true },
      activeOffering: { met: false, required: true }
    }
  }
}

// Mobile app converts to array:
[
  { key: 'completeProfile', label: 'Complete Profile', satisfied: true },
  { key: 'activeOffering', label: 'Active Offering', satisfied: false }
]
```

### 3. Currency Support

**40+ currencies supported:**
- Uses `CurrencyService` for all currency operations
- Currency picker modal shows: `USD - US Dollar ($)`
- Supports all major markets worldwide

### 4. Error Recovery

**Robust error handling:**
- Uses `Promise.allSettled` for concurrent requests
- Individual failures don't block entire dashboard
- Graceful degradation (show partial data)
- User-friendly error messages
- Retry options for recoverable errors

### 5. Navigation Safety

**Prevents navigation errors:**
- Checks `navigation.canGoBack()` before calling `goBack()`
- Falls back to Profile screen if can't go back
- Always shows back button in header

---

## Future Enhancements

### Potential Improvements

1. **Rate Unit Picker:** Make rate unit editable (currently display only)
2. **Category Picker:** Make category editable (currently display only)
3. **Portfolio Upload:** Native file picker for portfolio items
4. **Availability Calendar:** Visual calendar view for availability
5. **Booking Details:** Detailed booking view screen
6. **Payment Integration:** Stripe PaymentSheet for booking payments
7. **Notifications:** Push notifications for new bookings
8. **Analytics:** Revenue and booking analytics dashboard

---

## Troubleshooting

### Common Issues

**Issue:** 401 Authentication errors  
**Solution:** Ensure token is valid and sent as `Authorization: Bearer {token}` header only

**Issue:** 404 Profile not found  
**Solution:** User needs to complete onboarding first

**Issue:** Currency picker not working  
**Solution:** Ensure `CurrencyService` is imported and `SUPPORTED_CURRENCIES` uses `currencyService.getSupportedCurrencies()`

**Issue:** Prerequisites showing as undefined  
**Solution:** API returns object format, mobile app converts to array in `renderVerificationSection()`

**Issue:** Navigation errors  
**Solution:** Always check `navigation.canGoBack()` before calling `goBack()`

---

## References

- **API Documentation:** See web team response in `WEB_TEAM_SERVICE_PROVIDER_API_VERIFICATION.md`
- **UI/UX Guidelines:** See `NEW_WEB_TEAM_SERVICE_PROVIDER_UI_RESPONSE.md`
- **Workflow:** See `SERVICE_PROVIDER_WORKFLOW_EXPLANATION.md`
- **Service Layer:** `src/services/creatorExpansionService.ts`
- **Types:** `src/types/index.ts` and `src/types/database.ts`

---

**Status:** ✅ Complete  
**Last Updated:** December 12, 2024  
**Maintained By:** Mobile App Team

