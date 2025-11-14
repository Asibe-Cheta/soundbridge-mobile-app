# Mobile Team - UX Improvements Backend Requirements

**Date:** November 7, 2025  
**From:** Mobile Development Team  
**To:** Web App Development Team  
**Priority:** High  
**Context:** Implementing comprehensive UX improvements to make SoundBridge's unique value propositions visible to users

---

## Overview

We're implementing major UX improvements to the mobile app based on user feedback. These improvements will highlight our key differentiators (tipping, collaboration, personalization, creator earnings) that make SoundBridge unique.

Before we can proceed with implementation, we need to confirm the exact database schema, field names, and API endpoints for several features. This document lists all our questions organized by feature area.

**Most improvements use existing backend infrastructure** - we just need confirmation of exact field names and endpoint routes to ensure consistency between web and mobile apps.

---

## SECTION 1: USER PROFILE DATA SCHEMA

### 1.1 Distance Preference for Event Discovery

**Related to:** Directive 5C - Events section personalization  
**Use case:** Display "Events Near You - Based on Your Preferences" with subtitle showing "[Genre1] · [Genre2] · [Distance] miles"

**Questions:**
1. Does the `profiles` table have a field for user's preferred event discovery radius?
2. If yes, what is the exact field name? (e.g., `preferred_distance`, `event_radius`, `max_event_distance`)
3. What is the data type? (integer, float)
4. What unit is it stored in? (miles, kilometers)
5. What is the default value if the user hasn't set a preference?
6. If this field doesn't exist, should we add it? What would you recommend for the default value?

---

### 1.2 Genre Preferences Storage

**Related to:** Directives 5A, 5B, 6 - Personalization labels and event matching  
**Use case:** Display "Trending in [UserGenre] · [UserCity]" and match events to user preferences

**Questions:**
1. Confirm: Genre preferences are stored from the onboarding flow, correct?
2. What is the exact field name in the `profiles` table? (e.g., `preferred_genres`, `genre_preferences`, `genres`)
3. What is the data structure?
   - Array of strings: `["Gospel", "R&B"]`
   - Array of IDs: `[1, 2, 3]` (referencing a genres table)
   - Junction table: `user_genres` with foreign keys
4. If it's IDs, what's the table name for genre lookup?
5. Maximum number of genres a user can select?

---

### 1.3 Location/City Storage

**Related to:** Directive 5A - Personalization labels  
**Use case:** Display "Trending in [UserGenre] · [UserCity]"

**Questions:**
1. What is the exact field name for user's city? (e.g., `city`, `location`, `user_city`)
2. Is this in the `profiles` table or a separate `user_locations` table?
3. Data type: string (city name) or integer (city ID)?
4. If integer, what's the lookup table name?

---

### 1.4 Subscription Tier

**Related to:** Directive 12 - Upload limit indicator  
**Use case:** Display "Free Tier Active" or "Pro Tier Active" with upload limits

**Questions:**
1. What is the exact field name for subscription tier? (e.g., `subscription_tier`, `plan_type`, `tier`)
2. What are the possible values? (e.g., `"free"`, `"pro"`, `"premium"`)
3. Is this in the `profiles` table or a separate `subscriptions` table?
4. If separate table, what's the table name and how do we join it to the user?

---

### 1.5 Upload Tracking

**Related to:** Directive 12 - Upload limit indicator  
**Use case:** Display "X remaining this month" for track uploads

**Questions:**
1. How do you track the number of uploads per user per month?
   - Calculated query counting rows in `tracks` table with `created_at` filter?
   - Dedicated field that resets monthly?
   - Separate `upload_quota` table?
2. What defines "this month"?
   - Calendar month (resets on 1st of each month)?
   - Billing cycle (resets on user's subscription renewal date)?
3. If billing cycle, what field stores the billing period start date? (e.g., `billing_cycle_start`, `subscription_start_date`)
4. What are the upload limits per tier?
   - Free: 3 tracks/month
   - Pro: 10 tracks/month
   - Are these correct?

---

## SECTION 2: CREATOR/ARTIST PROFILE DATA SCHEMA

### 2.1 Collaboration Availability

**Related to:** Directives 7, 10 - Collaboration badges and request feature  
**Use case:** Display "Available to Collaborate" badge and enable collaboration requests

**Questions:**
1. What is the exact field name for availability status?
   - Boolean field: `has_availability`, `is_available_for_collaboration`, `accepts_collaborations`?
2. Where is this stored? `profiles` table or separate `creator_settings` table?
3. What is the exact field name for the availability calendar?
   - `availability_calendar`, `collaboration_calendar`, `available_dates`?
4. What is the structure of the calendar data?
   - JSON object with date ranges: `{ "2025-11-10": ["09:00-12:00", "14:00-17:00"], ... }`
   - Array of date objects: `[{ date: "2025-11-10", slots: [...] }]`
   - Separate `availability_slots` table?
5. If it's a separate table, what's the table name and structure?

---

### 2.2 Creator Genre and Location

**Related to:** Directive 5B - Featured Creator personalization  
**Use case:** Display "Featured Creator - [CreatorGenre] · [CreatorLocation]"

**Questions:**
1. Confirm: Creator genre is stored in the same field as user genre preferences?
2. For creators, is genre a single value or multiple values?
3. If multiple, do we display all or just the primary genre?
4. Same field names as Section 1.3 for location?

---

## SECTION 3: EVENT DATA SCHEMA

### 3.1 Event Genres/Tags

**Related to:** Directive 6 - Event match indicators  
**Use case:** Display "Matches: [Tag1] · [Tag2]" on event cards

**Questions:**
1. What is the exact field name for event genres/tags?
   - `genre`, `genres`, `tags`, `categories`, `event_categories`?
2. What is the data structure?
   - Single string: `"Gospel"`
   - Array of strings: `["Gospel", "R&B"]`
   - Array of IDs: `[1, 2, 3]`
   - Junction table: `event_genres` with foreign keys
3. If IDs or junction table, what's the lookup table name?
4. Can an event have multiple genres/tags?
5. If yes, what's the maximum number?

---

## SECTION 4: API ENDPOINTS

### 4.1 Tips Count Endpoint

**Related to:** Directive 9 - Display tips count on artist profiles  
**Use case:** Display "Received X tips this month"

**Questions:**
1. Does this endpoint exist?
2. If yes, what is the exact route?
   - `GET /api/tips/count/:artistId`
   - `GET /api/artists/:artistId/tips/count`
   - `GET /api/users/:userId/tips/received`
   - Other?
3. Does it require a time period parameter?
   - `?month=2025-11`
   - `?startDate=2025-11-01&endDate=2025-11-30`
   - Defaults to current month automatically?
4. What is the response format?
   ```json
   { "count": 15 }
   ```
   Or different structure?
5. Does it require authentication? If yes, what type? (JWT bearer token?)

---

### 4.2 Creator Earnings Summary Endpoint

**Related to:** Directive 11 - Creator earnings dashboard  
**Use case:** Display "Your Earnings This Month" with tips amount, streams, new followers

**Questions:**
1. Does this endpoint exist?
2. If yes, what is the exact route?
   - `GET /api/creator/earnings/:userId`
   - `GET /api/users/:userId/earnings`
   - `GET /api/analytics/earnings/:userId`
   - Other?
3. Does it require a time period parameter or default to current month?
4. What is the exact response format?
   ```json
   {
     "tipsAmount": 150.50,
     "streamsCount": 1250,
     "newFollowers": 45
   }
   ```
   Or different field names?
5. Does it include all three metrics (tips, streams, followers)?
6. If not, where do we get stream counts and follower growth data?
7. Currency for tips amount - stored as pence/cents (integer) or pounds/dollars (float)?

---

### 4.3 Collaboration Request Endpoint

**Related to:** Directive 10 - Collaboration request feature  
**Use case:** Submit collaboration requests between artists

**Questions:**
1. Does this endpoint exist? (We believe yes, from previous collaboration system work)
2. What is the exact route?
   - `POST /api/collaboration/requests`
   - `POST /api/collaborations/request`
   - Other?
3. What are the exact required parameters?
   ```json
   {
     "fromUserId": "uuid",
     "toUserId": "uuid",
     "projectType": "Recording",
     "proposedDate": "2025-11-15",
     "message": "Let's collaborate on..."
   }
   ```
   Are these field names correct?
4. What are the valid values for `projectType`?
   - Recording, Live Performance, Production, Other
   - Or different options?
5. Date format: ISO 8601 (`YYYY-MM-DD`) or different?
6. What is the success response format?
7. What error responses should we handle?

---

### 4.4 Tipping/Tips Submission Endpoint

**Related to:** Directive 8 - Tipping functionality UI  
**Use case:** Submit tips to artists via Stripe

**Questions:**
1. Does this endpoint exist? (We have a `TipModal.tsx` component, so assuming yes)
2. What is the exact route?
   - `POST /api/tips`
   - `POST /api/payments/tip`
   - Other?
3. What are the exact required parameters?
   ```json
   {
     "artistId": "uuid",
     "amount": 500,
     "userId": "uuid",
     "paymentMethodId": "pm_xxx"
   }
   ```
   Are these field names correct?
4. Is amount in pence/cents (500 = £5.00) or pounds/dollars (5.00)?
5. How does Stripe integration work?
   - Do we create PaymentIntent on client and send payment method ID?
   - Or do we send amount and you create PaymentIntent on backend?
6. What is the success response format?
7. What error responses should we handle?

---

## SECTION 5: EXISTING FEATURES - CONFIRMATION ONLY

These should already exist. We just need quick confirmation:

### 5.1 User Profile Data (Confirm)
- [ ] Genre preferences stored from onboarding
- [ ] User location/city stored
- [ ] User role (creator/listener) stored

### 5.2 Creator Stats (Confirm)
- [ ] Follower count accessible
- [ ] Track count accessible
- [ ] Stats displayed on profile

### 5.3 Event Data (Confirm)
- [ ] Events have location data
- [ ] Events filterable by location
- [ ] Events have date/time

### 5.4 Collaboration System (Confirm)
- [ ] Collaboration requests table exists
- [ ] Availability calendar system exists
- [ ] Collaboration messaging exists

---

## SECTION 6: POTENTIAL NEW REQUIREMENTS

These features might require new backend work if they don't exist:

### 6.1 Stream Count Tracking

**Question:** Do you track individual streams/plays per track?
- If yes, table name and structure?
- If no, should we add this? It's needed for creator earnings dashboard.

---

### 6.2 Follower Growth Tracking

**Question:** Can we query new followers gained in a specific time period?
- If yes, how? (created_at field in followers table?)
- If no, should we add tracking?

---

### 6.3 Monthly Upload Reset Logic

**Question:** Do you have automated logic that resets upload quotas monthly?
- If yes, how does it work?
- If no, should we implement this?

---

## SECTION 7: WEB APP CONSISTENCY

After we implement these UX improvements on mobile, the web app should implement the same features for consistency:

**Features to sync:**
1. Personalization labels (Trending in [Genre] · [City])
2. Event match indicators (Matches: Tag1 · Tag2)
3. Collaboration availability badges
4. Tipping UI prominently displayed
5. Creator earnings dashboard
6. Upload limit indicators
7. Value proposition education for new users

**Question:** Should we document these for you as we implement them, so you can mirror the UX on web?

---

## RESPONSE FORMAT

To make it easier to respond, please use this format:

### SECTION 1: USER PROFILE DATA SCHEMA

**1.1 Distance Preference:**
- Field name: `preferred_distance`
- Data type: `integer`
- Unit: `miles`
- Default: `25`

**1.2 Genre Preferences:**
- Field name: `preferred_genres`
- Structure: `Array of strings`
- Max genres: `5`

*(And so on for each section...)*

---

## PRIORITY LEVELS

To help you prioritize, here's what's blocking us:

**🔴 CRITICAL (Blocks Phase 2 implementation):**
- Section 1: All user profile schema questions
- Section 3: Event genres/tags schema
- Section 4.1: Tips count endpoint
- Section 4.2: Creator earnings endpoint

**🟡 HIGH (Needed for full feature set):**
- Section 2: Collaboration availability schema
- Section 4.3: Collaboration request endpoint
- Section 4.4: Tipping endpoint

**🟢 MEDIUM (Nice to have):**
- Section 6: Potential new requirements
- Section 7: Web app sync discussion

---

## TIMELINE

We're ready to start implementing immediately after receiving this information. Estimated implementation timeline:

- Phase 1 (Visual updates): 2-3 days
- Phase 2A (Display data): 2-3 days (after receiving your responses)
- Phase 2B (Interactive features): 3-4 days (after confirming APIs)
- Testing & Documentation: 1-2 days

**Total: ~8-10 days from receiving your responses**

---

## CONTACT

If you have any questions about why we need specific information or want to discuss implementation approach, please let us know.

Thank you for your help in making these UX improvements successful!

---

**Mobile Development Team**

