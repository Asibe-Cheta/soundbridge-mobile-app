# Creator Analytics Dashboard - Web Implementation Guide

## Overview
This document provides complete specifications for implementing creator analytics dashboards on the web platform. The mobile app has two comprehensive dashboards:
1. **Creator Insights Dashboard** - Multi-tab analytics view (Overview, Fans, Tracks, Growth)
2. **Creator Earnings Dashboard** - Revenue-focused view with earnings breakdown

---

## Table of Contents
1. [Database Schema & Queries](#database-schema--queries)
2. [Currency Conversion System](#currency-conversion-system)
3. [API Endpoints Required](#api-endpoints-required)
4. [Dashboard Specifications](#dashboard-specifications)
5. [Data Aggregation Logic](#data-aggregation-logic)
6. [UI/UX Components](#uiux-components)
7. [Testing Checklist](#testing-checklist)

---

## 1. Database Schema & Queries

### Primary Data Sources

#### 1.1 Revenue Data (Tips)
**Source:** `wallet_transactions` table (NOT `creator_tips`)

**Why:** The `wallet_transactions` table contains the actual amounts credited to creators after platform fees, while `creator_tips` stores the original tip amounts before fees.

```sql
-- Get creator tips (actual revenue after fees)
SELECT
  amount,
  currency,
  created_at,
  status
FROM wallet_transactions
WHERE user_id = $1
  AND transaction_type = 'tip_received'
  AND status IN ('completed', 'pending')
  AND created_at >= $2
  AND created_at <= $3;
```

**Important Notes:**
- Always use `wallet_transactions` for revenue calculations
- The `amount` field represents the creator's revenue after the 5% platform fee
- Example: User tips $3.00 → Platform takes $0.15 (5%) → Creator receives $2.85
- Filter by both `completed` and `pending` statuses to show all incoming revenue

#### 1.2 Event Ticket Sales
```sql
-- Step 1: Get creator's events
SELECT id
FROM events
WHERE creator_id = $1;

-- Step 2: Get ticket sales for those events
SELECT
  amount_paid,
  purchase_date,
  status
FROM event_tickets
WHERE event_id = ANY($2)  -- Array of event IDs from step 1
  AND status = 'confirmed'
  AND purchase_date >= $3
  AND purchase_date <= $4;
```

#### 1.3 Service Bookings
**Note:** The `service_bookings` table schema may differ from TypeScript types.

**Current Schema Issue:** TypeScript types indicate `price_total` column exists, but actual database may use different column names. Verify your database schema first.

```sql
-- TODO: Verify actual column names in your database
SELECT
  price_total,  -- Or the actual price column name
  created_at,
  status
FROM service_bookings
WHERE provider_id = $1
  AND status IN ('confirmed', 'completed')
  AND created_at >= $2
  AND created_at <= $3;
```

**Action Required:** Check your production database schema:
```sql
\d service_bookings;  -- PostgreSQL command to describe table
```

#### 1.4 Track Performance
```sql
SELECT
  id,
  title,
  cover_art_url,  -- NOT 'cover_art'
  play_count,
  likes_count,
  shares_count,
  created_at
FROM audio_tracks
WHERE creator_id = $1  -- NOT 'user_id'
  AND deleted_at IS NULL
ORDER BY play_count DESC
LIMIT $2;
```

**Schema Notes:**
- Column is `cover_art_url` not `cover_art`
- Column is `creator_id` not `user_id`
- There is NO `download_count` column in the current schema

#### 1.5 Fan Demographics
```sql
-- Get fans who have tipped the creator
SELECT
  wt.user_id as fan_id,
  p.username,
  p.avatar_url,
  p.city,
  p.country,
  SUM(wt.amount) as total_spent,
  COUNT(wt.id) as tip_count
FROM wallet_transactions wt
JOIN profiles p ON wt.metadata->>'tipper_id' = p.id
WHERE wt.user_id = $1  -- Creator's ID
  AND wt.transaction_type = 'tip_received'
  AND wt.status IN ('completed', 'pending')
  AND wt.created_at >= $2
  AND wt.created_at <= $3
GROUP BY wt.user_id, p.username, p.avatar_url, p.city, p.country
ORDER BY total_spent DESC
LIMIT $4;
```

**Note:** The `tipper_id` is stored in the `metadata` JSONB field of wallet_transactions.

#### 1.6 Follower Growth
```sql
-- Get monthly follower growth
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as new_followers
FROM follows
WHERE following_id = $1  -- Creator's ID
  AND created_at >= $2
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month ASC;
```

---

## 2. Currency Conversion System

### 2.1 Why Currency Conversion is Critical

**Problem:** Revenue is stored in the original currency (e.g., USD), but users need to see amounts in their local currency (e.g., GBP, EUR, NGN).

**Example Scenario:**
- Creator receives a $2.85 USD tip
- Creator is in UK and expects to see £2.25 GBP
- Without conversion: Shows "$2.85" or incorrectly shows "£2.85"
- With conversion: Correctly shows "£2.25" using live exchange rates

### 2.2 Implementation Requirements

#### Option 1: Server-Side Conversion (Recommended)
**Pros:**
- Centralized logic
- Consistent across all platforms
- Easier to update exchange rates
- Better for caching

**Implementation:**
```javascript
// Backend API endpoint
GET /api/revenue/summary?targetCurrency=GBP

// Response includes converted amounts
{
  "tips": {
    "amount": 2.25,      // Converted to GBP
    "originalAmount": 2.85,
    "originalCurrency": "USD",
    "currency": "GBP",
    "count": 1
  }
}
```

#### Option 2: Client-Side Conversion
**Pros:**
- Reduces server load
- Faster for users (parallel requests)

**Implementation:**
```javascript
// Frontend service
class CurrencyConverter {
  async fetchExchangeRates(baseCurrency = 'USD') {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
    );
    const data = await response.json();
    this.rates = data.rates;

    // Cache for 1 hour
    this.cacheTimestamp = Date.now();
  }

  async convertCurrency(amount, fromCurrency, toCurrency) {
    if (!this.rates || this.isCacheExpired()) {
      await this.fetchExchangeRates('USD');
    }

    // Convert via USD as intermediate
    const amountInUSD = amount / this.rates[fromCurrency];
    return amountInUSD * this.rates[toCurrency];
  }
}
```

### 2.3 Exchange Rate API

**Free Tier Options:**
1. **exchangerate-api.com** (Used in mobile app)
   - Free tier: 1,500 requests/month
   - URL: `https://api.exchangerate-api.com/v4/latest/USD`
   - No API key required

2. **Open Exchange Rates**
   - Free tier: 1,000 requests/month
   - Requires API key
   - More reliable for production

3. **European Central Bank**
   - Free, no limits
   - EUR base only
   - URL: `https://api.exchangerate.host/latest`

### 2.4 Fallback Exchange Rates

**IMPORTANT:** Always implement fallback rates in case API is unavailable.

```javascript
const FALLBACK_RATES = {
  'USD': 1.0,
  'GBP': 0.79,   // $1 = £0.79
  'EUR': 0.92,   // $1 = €0.92
  'NGN': 1456.75,
  'ZAR': 18.25,
  'CAD': 1.35,
  'AUD': 1.52,
  'JPY': 149.50,
  'CNY': 7.24,
  'INR': 83.12,
  // Add more currencies as needed
};
```

**Update Schedule:** Update fallback rates monthly or quarterly.

### 2.5 Currency Detection

**Detect user's currency based on:**
1. User profile settings (if available)
2. User's country (from profile or IP geolocation)
3. Browser locale as fallback

```javascript
function getUserCurrency(user) {
  // Priority 1: Explicit user preference
  if (user.preferredCurrency) {
    return user.preferredCurrency;
  }

  // Priority 2: Country-based
  const countryToCurrency = {
    'US': 'USD',
    'GB': 'GBP',
    'NG': 'NGN',
    'ZA': 'ZAR',
    'CA': 'CAD',
    'AU': 'AUD',
    'JP': 'JPY',
    'CN': 'CNY',
    'IN': 'INR',
    // ... add more mappings
  };

  if (user.country) {
    return countryToCurrency[user.country] || 'USD';
  }

  // Priority 3: Browser locale
  const locale = navigator.language;
  if (locale.includes('GB')) return 'GBP';
  if (locale.includes('NG')) return 'NGN';

  // Default fallback
  return 'USD';
}
```

---

## 3. API Endpoints Required

### 3.1 Revenue Summary Endpoint

**Endpoint:** `GET /api/creator/revenue/summary`

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string
- `targetCurrency` (optional): Currency code (e.g., 'GBP', 'USD')

**Response:**
```json
{
  "success": true,
  "data": {
    "tips": {
      "amount": 2.25,
      "count": 1,
      "currency": "GBP",
      "change_percentage": 0
    },
    "eventTickets": {
      "amount": 0,
      "count": 0,
      "currency": "GBP",
      "change_percentage": 0
    },
    "serviceBookings": {
      "amount": 0,
      "count": 0,
      "currency": "GBP",
      "change_percentage": 0
    },
    "downloads": {
      "amount": 0,
      "count": 0,
      "currency": "GBP",
      "change_percentage": 0
    },
    "total": {
      "amount": 2.25,
      "currency": "GBP",
      "change_percentage": 0
    }
  }
}
```

### 3.2 Revenue Trend Endpoint

**Endpoint:** `GET /api/creator/revenue/trend`

**Query Parameters:**
- `period`: 'week' | 'month' | 'year'
- `targetCurrency` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-12-01",
      "amount": 2.25,
      "tips": 2.25,
      "tickets": 0,
      "bookings": 0,
      "downloads": 0
    },
    {
      "date": "2025-12-02",
      "amount": 0,
      "tips": 0,
      "tickets": 0,
      "bookings": 0,
      "downloads": 0
    }
    // ... more data points
  ]
}
```

### 3.3 Fan Demographics Endpoint

**Endpoint:** `GET /api/creator/fans/demographics`

**Query Parameters:**
- `limit` (optional): Number of results (default: 10)
- `startDate` (optional)
- `endDate` (optional)
- `targetCurrency` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "topCities": [
      {
        "city": "Lagos",
        "country": "Nigeria",
        "fanCount": 45,
        "totalSpent": 1250.00,
        "currency": "GBP",
        "engagementScore": 92
      }
    ],
    "topFans": [
      {
        "id": "user-123",
        "username": "john_doe",
        "avatarUrl": "https://...",
        "totalSpent": 125.50,
        "tipsGiven": 15,
        "ticketsPurchased": 2,
        "city": "London",
        "country": "UK",
        "currency": "GBP"
      }
    ]
  }
}
```

### 3.4 Track Performance Endpoint

**Endpoint:** `GET /api/creator/tracks/performance`

**Query Parameters:**
- `limit` (optional): Number of results (default: 10)
- `startDate` (optional)
- `endDate` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "track-123",
      "title": "My Song",
      "coverArt": "https://...",
      "plays": 1523,
      "likes": 245,
      "shares": 89,
      "downloads": 0,
      "revenue": 0,
      "playsChange": 12.5,
      "likesChange": 8.3
    }
  ]
}
```

### 3.5 Monthly Growth Endpoint

**Endpoint:** `GET /api/creator/growth/monthly`

**Query Parameters:**
- `months` (optional): Number of months (default: 6)
- `targetCurrency` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "month": "2025-08",
      "revenue": 0,
      "newFollowers": 0,
      "totalPlays": 0,
      "engagement": 0,
      "revenueChange": 0,
      "followerChange": 0
    },
    {
      "month": "2025-12",
      "revenue": 2.25,
      "newFollowers": 1,
      "totalPlays": 1523,
      "engagement": 334,
      "revenueChange": 100,
      "followerChange": 100
    }
  ]
}
```

---

## 4. Dashboard Specifications

### 4.1 Creator Insights Dashboard

**Route:** `/creator/insights`

**Layout:** Tabbed interface with 4 tabs

#### Tab 1: Overview
**Components:**
- Date range selector (7D, 30D, 1Y)
- Total revenue card (large, prominent)
- Revenue breakdown by category (4 cards: Tips, Tickets, Bookings, Downloads)
- Quick stats: Followers, Total Plays, Engagement

**Wireframe:**
```
┌────────────────────────────────────────┐
│  Creator Insights         [💰 Wallet]  │
├────────────────────────────────────────┤
│                                        │
│  Last 365 Days                         │
│  £7.00                                 │
│  [7D] [30D] [1Y*]                     │
│                                        │
├────────────────────────────────────────┤
│  [Overview*] [Fans] [Tracks] [Growth] │
├────────────────────────────────────────┤
│                                        │
│  Revenue Breakdown                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  │ ❤️   │ │ 🎫   │ │ 📅   │ │ ⬇️  ││
│  │Tips  │ │Event │ │Serv. │ │Down. ││
│  │£7.00 │ │£0.00 │ │£0.00 │ │£0.00 ││
│  │3 tx  │ │0 tx  │ │0 tx  │ │0 tx  ││
│  └──────┘ └──────┘ └──────┘ └──────┘│
│                                        │
│  [View Wallet] [Transaction History]  │
│                                        │
│  Quick Stats                           │
│  Followers: 1  Plays: 1,523           │
│  Engagement: 334                       │
└────────────────────────────────────────┘
```

#### Tab 2: Fans
**Components:**
- Top cities by engagement (bar chart or list)
- Top supporters list with:
  - Avatar
  - Username
  - Location (city, country)
  - Total spent
  - Number of tips

**Data Display:**
```
┌────────────────────────────────────────┐
│  Top Cities                            │
│  ┌──────────────────────────────────┐ │
│  │ 1. Lagos, Nigeria                │ │
│  │    45 fans • £1,250 spent        │ │
│  ├──────────────────────────────────┤ │
│  │ 2. London, UK                    │ │
│  │    32 fans • £985 spent          │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Top Supporters                        │
│  ┌──────────────────────────────────┐ │
│  │ 👤 john_doe                      │ │
│  │    London, UK                    │ │
│  │    £125.50 • 15 tips             │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

#### Tab 3: Tracks
**Components:**
- Track performance list showing:
  - Cover art thumbnail
  - Track title
  - Plays, likes, shares counts
  - Change percentages
  - Revenue (if applicable)

**Data Display:**
```
┌────────────────────────────────────────┐
│  Track Performance                     │
│  ┌──────────────────────────────────┐ │
│  │ 🖼️ My Song Title                 │ │
│  │    ▶️ 1,523 (+12.5%)             │ │
│  │    ❤️ 245 (+8.3%)                │ │
│  │    📤 89                          │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

#### Tab 4: Growth
**Components:**
- Monthly growth chart (line or bar chart)
- Metrics tracked:
  - Revenue
  - New followers
  - Total plays
  - Engagement score
- Change percentages month-over-month

**Chart Display:**
```
┌────────────────────────────────────────┐
│  Monthly Growth                        │
│  ┌──────────────────────────────────┐ │
│  │      Revenue Trend               │ │
│  │  £                               │ │
│  │  7├───────────────────────────   │ │
│  │  6│                            ●  │ │
│  │  5│                               │ │
│  │  4│                               │ │
│  │  3│                               │ │
│  │  2│                               │ │
│  │  1│                               │ │
│  │  0└─┬───┬───┬───┬───┬───┬───┬─  │ │
│  │    Aug Sep Oct Nov Dec Jan      │ │
│  └──────────────────────────────────┘ │
│                                        │
│  December 2025                         │
│  Revenue: £2.25 (+100%)                │
│  Followers: 1 (+100%)                  │
│  Plays: 1,523 (--%)                   │
└────────────────────────────────────────┘
```

### 4.2 Creator Earnings Dashboard

**Route:** `/creator/earnings`

**Layout:** Single page, earnings-focused

**Components:**
1. Header with wallet icon (navigates to wallet)
2. Large earnings card showing total for selected period
3. Date range selector (7D, 30D, 1Y)
4. Revenue breakdown by source
5. Revenue trend chart (last 7 days)
6. Top earning sources
7. Pending balance and lifetime earnings
8. Quick action buttons (View Wallet, Transaction History)

**Full Wireframe:**
```
┌────────────────────────────────────────┐
│  [←] Earnings Dashboard    [💰]        │
├────────────────────────────────────────┤
│                                        │
│  ┌────────────────────────────────┐  │
│  │  Last 365 Days                 │  │
│  │  £7.00                         │  │
│  └────────────────────────────────┘  │
│  [7D] [30D] [1Y*]                     │
│                                        │
│  Revenue Breakdown                     │
│  ┌────────────────────────────────┐  │
│  │ ❤️ Tips          £7.00        │  │
│  │    3 transactions              │  │
│  ├────────────────────────────────┤  │
│  │ 🎫 Event Tickets  £0.00       │  │
│  │    0 transactions              │  │
│  ├────────────────────────────────┤  │
│  │ 📅 Service Bookings £0.00     │  │
│  │    0 transactions              │  │
│  ├────────────────────────────────┤  │
│  │ ⬇️ Downloads      £0.00       │  │
│  │    0 transactions              │  │
│  └────────────────────────────────┘  │
│                                        │
│  Revenue Trend (Last 7 Days)          │
│  ┌────────────────────────────────┐  │
│  │  [Simple bar chart]            │  │
│  └────────────────────────────────┘  │
│                                        │
│  ┌──────────────┐ ┌──────────────┐  │
│  │ 💰 Pending   │ │ 📈 Lifetime  │  │
│  │    £0.00     │ │    £0.00     │  │
│  └──────────────┘ └──────────────┘  │
│                                        │
│  [View Wallet] [Transaction History]  │
└────────────────────────────────────────┘
```

---

## 5. Data Aggregation Logic

### 5.1 Revenue Calculation

**Step-by-step process:**

```javascript
async function calculateRevenue(userId, startDate, endDate, targetCurrency) {
  // 1. Fetch exchange rates
  await fetchExchangeRates();

  // 2. Get tips from wallet_transactions
  const tips = await db.query(`
    SELECT amount, currency
    FROM wallet_transactions
    WHERE user_id = $1
      AND transaction_type = 'tip_received'
      AND status IN ('completed', 'pending')
      AND created_at >= $2
      AND created_at <= $3
  `, [userId, startDate, endDate]);

  // 3. Convert each tip to target currency
  let totalTips = 0;
  for (const tip of tips) {
    const converted = await convertCurrency(
      tip.amount,
      tip.currency,
      targetCurrency
    );
    totalTips += converted;
  }

  // 4. Repeat for other revenue sources
  // ... (event tickets, service bookings, downloads)

  // 5. Calculate total
  const total = totalTips + totalTickets + totalBookings + totalDownloads;

  return {
    tips: { amount: totalTips, count: tips.length, currency: targetCurrency },
    eventTickets: { amount: totalTickets, count: ticketCount, currency: targetCurrency },
    serviceBookings: { amount: totalBookings, count: bookingCount, currency: targetCurrency },
    downloads: { amount: totalDownloads, count: downloadCount, currency: targetCurrency },
    total: { amount: total, currency: targetCurrency }
  };
}
```

### 5.2 Change Percentage Calculation

```javascript
function calculateChangePercentage(current, previous) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

// Example: Calculate revenue change
const currentPeriodRevenue = 7.00; // Last 30 days
const previousPeriodRevenue = 0;    // Previous 30 days
const changePercentage = calculateChangePercentage(
  currentPeriodRevenue,
  previousPeriodRevenue
); // Returns 100
```

### 5.3 Engagement Score Calculation

```javascript
function calculateEngagementScore(plays, likes, shares, comments) {
  // Weighted formula (adjust weights as needed)
  const playWeight = 1;
  const likeWeight = 3;
  const shareWeight = 5;
  const commentWeight = 4;

  return (
    (plays * playWeight) +
    (likes * likeWeight) +
    (shares * shareWeight) +
    (comments * commentWeight)
  );
}
```

### 5.4 Date Range Utilities

```javascript
function getDateRange(period) {
  const now = new Date();
  let startDate;

  switch (period) {
    case '7D':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30D':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '1Y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString()
  };
}
```

---

## 6. UI/UX Components

### 6.1 Date Range Selector

**Component:**
```jsx
function DateRangeSelector({ selected, onChange }) {
  const ranges = [
    { label: '7D', value: '7D' },
    { label: '30D', value: '30D' },
    { label: '1Y', value: '1Y' }
  ];

  return (
    <div className="date-range-selector">
      {ranges.map(range => (
        <button
          key={range.value}
          className={selected === range.value ? 'active' : ''}
          onClick={() => onChange(range.value)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
```

### 6.2 Revenue Card Component

```jsx
function RevenueCard({ title, amount, count, currency, icon, change }) {
  return (
    <div className="revenue-card">
      <div className="icon">{icon}</div>
      <div className="content">
        <h3>{title}</h3>
        <p className="amount">
          {formatCurrency(amount, currency)}
        </p>
        <p className="count">{count} transactions</p>
        {change !== undefined && (
          <p className={`change ${change >= 0 ? 'positive' : 'negative'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}
```

### 6.3 Currency Formatter

```javascript
function formatCurrency(amount, currencyCode) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Usage:
formatCurrency(2.25, 'GBP');  // Returns: "£2.25"
formatCurrency(2.85, 'USD');  // Returns: "$2.85"
formatCurrency(1456.75, 'NGN');  // Returns: "₦1,456.75"
```

### 6.4 Loading States

**Best Practices:**
- Show skeleton loaders for cards while data loads
- Display "Loading exchange rates..." message during currency conversion
- Use optimistic updates where possible

```jsx
function LoadingCard() {
  return (
    <div className="revenue-card loading">
      <div className="skeleton-icon"></div>
      <div className="skeleton-text"></div>
      <div className="skeleton-amount"></div>
    </div>
  );
}
```

### 6.5 Empty States

**When to show:**
- No revenue in selected period
- No fans yet
- No tracks uploaded

```jsx
function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}

// Usage:
<EmptyState
  icon="💰"
  title="No earnings yet"
  description="Start receiving tips, selling tickets, or booking services to see your revenue here."
  action={{
    label: "Share Your Profile",
    onClick: () => navigate('/profile/share')
  }}
/>
```

---

## 7. Testing Checklist

### 7.1 Functional Testing

- [ ] **Revenue Display**
  - [ ] Tips show correct amount from wallet_transactions (not creator_tips)
  - [ ] Amounts are converted to user's local currency
  - [ ] Platform fees are already deducted (showing net revenue)
  - [ ] Both completed and pending transactions are included

- [ ] **Currency Conversion**
  - [ ] Live exchange rates are fetched successfully
  - [ ] Fallback rates work when API is unavailable
  - [ ] Multi-currency tips are converted correctly
  - [ ] Conversion cache expires after 1 hour
  - [ ] All supported currencies display correctly

- [ ] **Date Ranges**
  - [ ] 7D, 30D, 1Y filters work correctly
  - [ ] Custom date ranges are supported
  - [ ] Date ranges respect user's timezone
  - [ ] Data updates when range changes

- [ ] **Fan Demographics**
  - [ ] Top cities show correct aggregations
  - [ ] Top fans are ordered by total spent
  - [ ] Location data (city, country) displays correctly
  - [ ] Fan counts are accurate

- [ ] **Track Performance**
  - [ ] Play counts are accurate
  - [ ] Likes and shares display correctly
  - [ ] Cover art images load properly
  - [ ] Change percentages calculate correctly

- [ ] **Navigation**
  - [ ] All navigation links work
  - [ ] Back button returns to previous screen
  - [ ] Wallet and Transaction History links work
  - [ ] Deep linking works (if applicable)

### 7.2 Edge Cases

- [ ] **No Data Scenarios**
  - [ ] Empty states display appropriately
  - [ ] Zero revenue shows "£0.00" not "null"
  - [ ] No fans message is helpful

- [ ] **Large Numbers**
  - [ ] Values over 1,000 format correctly (£1,234.56)
  - [ ] Values over 1 million use compact format (£1.2M)
  - [ ] Very small amounts (< £0.01) display correctly

- [ ] **API Failures**
  - [ ] Exchange rate API failure shows fallback rates
  - [ ] Database errors show error message
  - [ ] Retry mechanisms work

- [ ] **Performance**
  - [ ] Dashboard loads in < 2 seconds
  - [ ] Currency conversion doesn't block UI
  - [ ] Large datasets paginate properly

### 7.3 Cross-Browser Testing

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Mobile browsers (responsive design)

### 7.4 Accessibility Testing

- [ ] Screen reader compatibility
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators are visible

### 7.5 Security Testing

- [ ] Authorization checks prevent viewing other creators' data
- [ ] SQL injection prevention in queries
- [ ] Rate limiting on API endpoints
- [ ] Sensitive data not logged

---

## 8. Common Pitfalls & Solutions

### 8.1 Using Wrong Data Source for Tips

❌ **Wrong:**
```sql
SELECT amount FROM creator_tips WHERE creator_id = $1;
```

✅ **Correct:**
```sql
SELECT amount FROM wallet_transactions
WHERE user_id = $1
  AND transaction_type = 'tip_received'
  AND status IN ('completed', 'pending');
```

**Why:** `creator_tips` stores original amounts before fees. `wallet_transactions` stores actual amounts credited to creator.

### 8.2 Not Converting Currencies

❌ **Wrong:**
```javascript
// Showing USD amount to UK user
display("$2.85"); // User expects £
```

✅ **Correct:**
```javascript
const converted = await convertCurrency(2.85, 'USD', 'GBP');
display(formatCurrency(converted, 'GBP')); // £2.25
```

### 8.3 Incorrect Column Names

❌ **Wrong:**
```sql
SELECT cover_art, user_id FROM audio_tracks;
```

✅ **Correct:**
```sql
SELECT cover_art_url, creator_id FROM audio_tracks;
```

### 8.4 Not Handling Missing Exchange Rates

❌ **Wrong:**
```javascript
const rate = exchangeRates[currency]; // Could be undefined
const converted = amount * rate; // NaN if rate is undefined
```

✅ **Correct:**
```javascript
const rate = exchangeRates[currency] || FALLBACK_RATES[currency] || 1;
const converted = amount * rate;
```

### 8.5 Ignoring Platform Fees

❌ **Wrong:**
```javascript
// Using original tip amount
const tipAmount = 3.00; // User tipped $3
```

✅ **Correct:**
```javascript
// Using amount from wallet_transactions (after 5% fee)
const tipAmount = 2.85; // Creator receives $2.85
```

---

## 9. Performance Optimization

### 9.1 Caching Strategy

**What to cache:**
- Exchange rates (1 hour TTL)
- Revenue summaries (5 minutes TTL)
- Fan demographics (15 minutes TTL)
- Track performance (10 minutes TTL)

**Implementation:**
```javascript
// Redis cache example
const cacheKey = `revenue:${userId}:${period}:${currency}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await calculateRevenue(userId, period, currency);
await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5 min TTL
return data;
```

### 9.2 Database Indexing

**Required indexes:**
```sql
-- Wallet transactions (tips)
CREATE INDEX idx_wallet_transactions_user_type_status
ON wallet_transactions(user_id, transaction_type, status);

CREATE INDEX idx_wallet_transactions_created_at
ON wallet_transactions(created_at);

-- Event tickets
CREATE INDEX idx_event_tickets_event_status
ON event_tickets(event_id, status);

-- Audio tracks
CREATE INDEX idx_audio_tracks_creator_deleted
ON audio_tracks(creator_id, deleted_at);

-- Follows
CREATE INDEX idx_follows_following_created
ON follows(following_id, created_at);
```

### 9.3 Query Optimization

**Use aggregations in database, not application:**

❌ **Wrong:**
```javascript
const tips = await getAllTips(userId);
const total = tips.reduce((sum, tip) => sum + tip.amount, 0);
```

✅ **Correct:**
```sql
SELECT SUM(amount) as total
FROM wallet_transactions
WHERE user_id = $1
  AND transaction_type = 'tip_received';
```

---

## 10. Deployment Checklist

### 10.1 Before Deployment

- [ ] All API endpoints tested
- [ ] Currency conversion tested with multiple currencies
- [ ] Database migrations applied
- [ ] Indexes created
- [ ] Cache warming implemented
- [ ] Error logging configured
- [ ] Monitoring alerts set up

### 10.2 Post-Deployment

- [ ] Verify exchange rates API is working
- [ ] Check database query performance
- [ ] Monitor error rates
- [ ] Test with real user data
- [ ] Verify currency conversions are accurate
- [ ] Check analytics tracking

### 10.3 Rollback Plan

- [ ] Database migration rollback scripts ready
- [ ] Feature flag to disable dashboards if needed
- [ ] Fallback to old analytics (if applicable)

---

## 11. Future Enhancements

### Phase 2 Features
1. **Download Sales Tracking**
   - Track paid downloads
   - Show revenue per track

2. **Comparison Views**
   - Compare current vs previous period
   - Year-over-year comparisons

3. **Export Functionality**
   - Export data as CSV
   - PDF reports

4. **Advanced Filters**
   - Filter by revenue source
   - Filter by fan location
   - Custom date ranges

5. **Predictive Analytics**
   - Revenue projections
   - Growth forecasts

### Phase 3 Features
1. **Real-time Updates**
   - Live revenue counter
   - Real-time fan activity

2. **Goals & Milestones**
   - Set revenue targets
   - Track progress

3. **Detailed Breakdowns**
   - Revenue by fan
   - Revenue by track
   - Revenue by location

---

## 12. Support & Resources

### Documentation References
- [Mobile App Implementation](/CREATOR_ANALYTICS_DASHBOARDS_IMPLEMENTATION.md)
- [Database Schema](/src/types/database.ts)
- [Currency Service](/src/services/CurrencyService.ts)
- [Revenue Service](/src/services/CreatorRevenueService.ts)

### API Documentation
- Exchange Rate API: https://api.exchangerate-api.com/
- Supabase Docs: https://supabase.com/docs

### Contact
For questions or clarifications, contact the mobile development team or refer to the mobile app source code.

---

## Appendix A: Sample API Responses

### A.1 Revenue Summary
```json
{
  "success": true,
  "data": {
    "tips": {
      "amount": 2.25,
      "count": 1,
      "currency": "GBP",
      "change_percentage": 0,
      "transactions": [
        {
          "id": "txn-123",
          "amount": 2.85,
          "originalCurrency": "USD",
          "convertedAmount": 2.25,
          "currency": "GBP",
          "date": "2025-12-07T04:23:01.799Z",
          "status": "pending"
        }
      ]
    },
    "total": {
      "amount": 2.25,
      "currency": "GBP"
    }
  },
  "metadata": {
    "exchangeRateSource": "exchangerate-api.com",
    "exchangeRateTimestamp": "2026-01-13T16:00:00.000Z",
    "usdToGbpRate": 0.79
  }
}
```

### A.2 Exchange Rates API Response
```json
{
  "base": "USD",
  "date": "2026-01-13",
  "rates": {
    "GBP": 0.79,
    "EUR": 0.92,
    "NGN": 1456.75,
    "ZAR": 18.25,
    "CAD": 1.35,
    "AUD": 1.52,
    "JPY": 149.50
  }
}
```

---

**Document Version:** 1.0
**Last Updated:** January 13, 2026
**Author:** Mobile Development Team
**Status:** Ready for Implementation
