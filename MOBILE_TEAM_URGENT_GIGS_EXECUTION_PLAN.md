# Mobile Team — Urgent Gigs & Opportunity Enhancements: Full Execution Plan

**Date:** 2026-02-24
**Author:** Mobile Team (internal)
**Status:** Planning — execute layer by layer
**Companion doc:** `WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md`

---

## Context & Philosophy

The existing **Planned Opportunities** system is nearly complete and working. What we are building is an **Urgent Gigs** layer on top of it — a separate, real-time, location-matched, last-minute booking product. Both co-exist. Do not break anything in the existing opportunity flow.

**Build rule:** We do not build the urgent gig screens until the backend endpoints exist. We can build layers 5–6 (enhancements to existing screens, rating, dispute) while waiting for the backend.

---

## Current Existing Flow (Do Not Break)

```
CreateOpportunityScreen
  → POST /api/opportunities
  → OpportunityCard (feed)
  → ExpressInterestModal → POST /api/opportunities/{id}/interest
  → OpportunityInterestListScreen (poster views interests)
  → ProjectAgreementModal → POST /api/opportunities/{id}/interests/{interestId}/accept
     → Stripe Payment Intent → escrow held
  → OpportunityProjectScreen
     → Creator: accept/decline agreement
     → Creator: mark-delivered
     → Poster: confirm-delivery (releases escrow) OR dispute
  → Wallet → WithdrawalScreen → WithdrawalMethodsScreen
```

---

## Layer 1 — Database / Type Alignment (mobile side)

**Dependency:** Web team must add columns first. We update our TypeScript types after.

### 1.1 Update TypeScript types for Opportunity (src/types/opportunity.types.ts or wherever defined)

Add to existing `Opportunity` interface:
```typescript
gig_type?: 'urgent' | 'planned';
expires_at?: string;           // ISO datetime — urgent gigs only
skill_required?: string;       // single skill for urgent gigs
genre?: string[];              // e.g. ['gospel', 'jazz']
location_lat?: number;
location_lng?: number;
location_radius_km?: number;
payment_status?: 'pending' | 'escrowed' | 'released' | 'refunded';
```

### 1.2 Create new UserAvailability type (src/types/availability.types.ts)
```typescript
export interface DayAvailability {
  available: boolean;
  hours?: 'all_day' | string; // e.g. "18:00-23:00"
}

export interface AvailabilitySchedule {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

export interface UserAvailability {
  id: string;
  user_id: string;
  available_for_urgent_gigs: boolean;
  current_lat?: number;
  current_lng?: number;
  general_area?: string;
  max_radius_km: number;
  hourly_rate?: number;
  per_gig_rate?: number;
  rate_negotiable: boolean;
  availability_schedule: AvailabilitySchedule;
  last_location_update?: string;
  dnd_start?: string;          // e.g. "23:00"
  dnd_end?: string;            // e.g. "08:00"
  max_notifications_per_day: number;
  created_at: string;
  updated_at: string;
}
```

### 1.3 Create GigRating type (src/types/gig-rating.types.ts)
```typescript
export interface GigRating {
  id: string;
  gig_id: string;       // opportunity_project id
  rater_id: string;
  ratee_id: string;
  overall_rating: number;          // 1-5
  professionalism_rating: number;  // 1-5
  punctuality_rating: number;      // 1-5
  quality_rating?: number;         // 1-5, providers only
  payment_promptness_rating?: number; // 1-5, requesters only
  review_text?: string;
  created_at: string;
}
```

### 1.4 Create UrgentGig types (src/types/urgent-gig.types.ts)
```typescript
export type GigStatus = 'searching' | 'pending_acceptance' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type GigResponseStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface UrgentGig {
  id: string;
  created_by: string;
  gig_type: 'urgent' | 'planned';
  title: string;
  description?: string;
  skill_required: string;
  genre: string[];
  location_lat: number;
  location_lng: number;
  location_address: string;
  location_radius_km: number;
  date_needed: string;       // ISO datetime
  duration_hours: number;
  payment_amount: number;
  payment_currency: string;
  payment_status: 'pending' | 'escrowed' | 'released' | 'refunded';
  status: GigStatus;
  selected_provider_id?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Computed for display
  distance_km?: number;
  match_score?: number;
  requester?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    rating?: number;
    review_count?: number;
  };
}

export interface GigResponse {
  id: string;
  gig_id: string;
  provider_id: string;
  status: GigResponseStatus;
  response_time_seconds?: number;
  message?: string;
  notified_at: string;
  responded_at?: string;
  created_at: string;
  // Populated for requester's view
  provider?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    headline?: string;
    rating?: number;
    review_count?: number;
    distance_km?: number;
    hourly_rate?: number;
    per_gig_rate?: number;
  };
}
```

---

## Layer 2 — New Service Files

### 2.1 Create src/services/UrgentGigService.ts
```typescript
// Endpoints to implement:
// POST   /api/gigs/urgent              — post new urgent gig (includes Stripe payment)
// GET    /api/gigs/urgent/:id          — get gig + responses for requester
// GET    /api/gigs/urgent/:id/responses — provider list for requester
// POST   /api/gigs/:id/respond         — provider accepts or declines
// POST   /api/gigs/:id/select          — poster selects provider
// POST   /api/gigs/:id/complete        — mark gig complete (triggers escrow release)
// POST   /api/gigs/:id/dispute         — raise dispute
// GET    /api/gigs/my                  — all gigs posted by current user
// GET    /api/gigs/available           — gigs available to current provider (matched)
```

Key methods:
- `postUrgentGig(gigData, paymentDetails)` — creates gig + Stripe Payment Intent
- `getGigDetails(gigId)` — full gig with responses
- `respondToGig(gigId, { action: 'accept' | 'decline', message? })` — provider response
- `selectProvider(gigId, responseId)` — poster chooses winner
- `markComplete(gigId)` — either party marks complete
- `raiseDispute(gigId, reason, description, evidenceUris[])` — dispute with evidence

### 2.2 Create src/services/AvailabilityService.ts
```typescript
// Endpoints:
// GET    /api/user/availability        — get current user's availability settings
// PATCH  /api/user/availability        — update availability settings
// POST   /api/user/availability/location — update current GPS location

// Methods:
// getMyAvailability(): Promise<UserAvailability>
// updateAvailability(data: Partial<UserAvailability>): Promise<UserAvailability>
// updateLocation(lat: number, lng: number): Promise<void>
// geocodeArea(areaText: string): Promise<{ lat: number, lng: number }>
```

### 2.3 Create src/services/GigRatingService.ts
```typescript
// Endpoints:
// POST   /api/gig-ratings              — submit rating
// GET    /api/gig-ratings/:projectId   — get ratings for a project (after both submitted)
// GET    /api/users/:userId/ratings    — get all ratings for a user (for profile)

// Methods:
// submitRating(projectId, ratingData: Partial<GigRating>): Promise<void>
// getProjectRatings(projectId): Promise<{ my_rating: GigRating, their_rating: GigRating } | null>
// getUserRatings(userId, page): Promise<{ ratings: GigRating[], average: number }>
```

### 2.4 Create src/services/DisputeService.ts
```typescript
// Endpoints:
// POST   /api/disputes                 — raise dispute (with evidence)
// GET    /api/disputes/:disputeId      — get dispute details + status
// POST   /api/disputes/:disputeId/respond — other party's counter-response

// Methods:
// raiseDispute(projectId, reason, description, evidenceUris[]): Promise<{ disputeId: string }>
// getDisputeDetails(disputeId): Promise<DisputeDetails>
// respondToDispute(disputeId, response, counterEvidenceUris[]): Promise<void>
```

---

## Layer 3 — New Screens to Build

> Build order within this layer: Provider Availability → Rating → Dispute → Urgent Gig Post → Real-time Searching → Provider Gig Detail

---

### Screen 3.1 — ProviderAvailabilityScreen (src/screens/ProviderAvailabilityScreen.tsx)

**Route:** Accessible from Profile settings menu

**UI Sections:**

**A. Master toggle**
```
[Toggle] Available for Urgent Gigs
Subtitle: "When on, you'll receive real-time notifications for last-minute gigs near you."
```

**B. Location mode (only visible if toggle ON)**
```
Radio: ○ Use precise GPS location  ● Use general area
If general area: TextInput for city/area name
              [Locate on Map] optional
```

**C. Travel radius (slider)**
```
Values: 5km / 10km / 20km / 50km / 100km
Label: "How far will you travel?"
```

**D. Your rates**
```
Hourly rate: £ [____]
Per gig rate: £ [____]
[Checkbox] Rates are negotiable
```

**E. Weekly availability schedule**
- For each day (Mon–Sun):
  - Row with: day name + Toggle (on/off)
  - If ON: two time pickers (from / to) OR "All day" button
  - Time pickers use native DateTimePicker in time mode

**F. Notification limits**
```
Max urgent gig notifications per day: [Stepper 1–10, default 5]
```

**G. Do Not Disturb**
```
Don't send notifications:
From: [TimePicker 23:00]  To: [TimePicker 08:00]
```

**H. Save button → PATCH /api/user/availability**

**State management:** Local state mirrors `UserAvailability`, synced on load, saved on tap.

**Location permission:** If GPS mode selected, request `Location.requestForegroundPermissionsAsync()` (expo-location already installed).

---

### Screen 3.2 — PostGigRatingScreen (src/screens/PostGigRatingScreen.tsx)

**Trigger:** Shown automatically after `confirm-delivery` completes on `OpportunityProjectScreen`. Both parties see it independently.

**Props:** `projectId`, `rateeId`, `rateeName`, `rateeAvatar`, `role: 'requester' | 'provider'`

**UI:**
```
Avatar + "How was your experience with [Name]?"

★★★★★  Overall

★★★★★  Professionalism
★★★★★  Punctuality

// If rating a provider:
★★★★★  Quality of work

// If rating a requester:
★★★★★  Payment promptness

[TextInput] "Write a review... (optional)"
Max 500 chars

[i] You won't see their rating until both have submitted.

[Submit Rating]  [Skip for now]
```

**On submit:** `POST /api/gig-ratings` → success toast → navigate away.

**On skip:** Dismiss with local flag — don't show again for this project.

---

### Screen 3.3 — DisputeDetailScreen (src/screens/DisputeDetailScreen.tsx)

**Replaces** the current `Alert`-based dispute UX on `OpportunityProjectScreen`.

**Route:** Navigated to from "Raise Dispute" button on project screen. Also navigated to from in-app notification when a dispute is raised against you.

**States this screen handles:**

**A. Raise dispute (initiator)**
```
"Raise a Dispute"

Reason [Dropdown]:
  - Provider didn't show up
  - Provider showed up late
  - Service quality unsatisfactory
  - Service not as described
  - (Provider) Requester changed requirements
  - (Provider) Requested unpaid extra work
  - (Provider) Payment issue

Description [TextArea, min 50 chars]

Evidence (optional)
  [+ Add Photo] — up to 5 images
  Thumbnail grid of added images

[Submit Dispute]
```

**B. Dispute pending — your side (after you submitted)**
```
"Dispute Under Review"
Status badge: PENDING / UNDER_REVIEW / RESOLVED

Your submission:
  Reason: [your reason]
  Description: [your text]
  Evidence: [thumbnail grid]

Timeline:
  Dispute raised: [date]
  Response deadline: [date +72h]
  Expected resolution: [date +72h]

"Our team reviews all disputes within 72 hours.
Payment is held securely until resolved."
```

**C. Dispute raised against you (other party's submission)**
```
"A Dispute Has Been Raised"

[Other party name] raised a dispute:
  Reason: [their reason]
  Their account: [description]

Your response:
  [TextArea] "Your side of the story..."
  [+ Add Evidence] — up to 5 images

[Submit Response]
```

**D. Resolved**
```
"Dispute Resolved"
Decision: [Full refund to requester / Full payment to provider / Partial split]
Amount: [relevant figure]
"This decision is final."
```

---

### Screen 3.4 — UrgentGigTypeSelectionScreen (src/screens/UrgentGigTypeSelectionScreen.tsx)

**Route:** Entry point when user taps "Post a Gig" from the feed or opportunities screen. Replaces direct navigation to `CreateOpportunityScreen`.

**UI:** Two large tappable cards side by side or stacked:

```
[POST A GIG]
Plan a collaboration, event,
or job. No rush.
→ Goes to existing CreateOpportunityScreen

[URGENT GIG 🔥]
Need someone right now.
Last-minute, location-based.
→ Goes to CreateUrgentGigScreen (new)
```

---

### Screen 3.5 — CreateUrgentGigScreen (src/screens/CreateUrgentGigScreen.tsx)

**Multi-step form. Use a step indicator at the top (Step 1 of 3, etc.)**

**Step 1 — Details**
```
Skill needed [Dropdown, searchable]:
  Trumpeter, Vocalist, Drummer, DJ, Sound Engineer,
  Pianist, Guitarist, Bassist, Violinist, Saxophonist,
  Vocal Coach, Music Producer, Choir Director, Percussionist,
  Backing Singer, MC/Host, Other...

Genre (select all that apply) [Chip multi-select]:
  Gospel, Jazz, R&B, Classical, Afrobeats, Hip-Hop,
  Pop, Rock, Soul, Country, Worship, Latin, Electronic, Other

Date & Time [DateTimePicker]
  Must be ≥ 1 hour in the future

Duration [Slider: 1–8 hours, 0.5h steps]
  Display: "2.5 hours"

Location [TextInput with Google Places autocomplete]
  Address stored + geocoded to lat/lng

Search radius [Segmented: 5km | 10km | 20km | 50km | 100km]

Payment amount [TextInput, numeric]
  Currency [Dropdown: GBP | USD | EUR | NGN]

Description [TextInput, optional, max 500 chars]

[Continue →]
```

**Step 2 — Payment**
```
Summary card:
  🎺 Trumpeter — Tonight 7:00 PM
  Gospel · 2 hours · Luton area (20km radius)
  £120

"This amount will be held securely in escrow until
the service is confirmed complete."

Platform fee: 12%
You pay: £120.00
Creator receives: £105.60

[Stripe Payment Sheet]
[Confirm & Pay →]
```

**Step 3 — Searching (real-time)**
```
Animated pulse/radar graphic

"🔍 Finding the best trumpeters near you..."

→ Once backend responds:
"✅ Notified 8 musicians nearby"

"Accepting responses now — usually fills in minutes"

[View Responses →] (once ≥1 accepted)
[Cancel Gig] (refunds escrow)
```

**Navigation:** After "View Responses", push `UrgentGigResponsesScreen`.

---

### Screen 3.6 — UrgentGigResponsesScreen (src/screens/UrgentGigResponsesScreen.tsx)

**Real-time — uses Supabase Realtime subscription on `gig_responses` for this gigId.**

**Header:** Gig summary + time remaining (countdown from `expires_at`)

**Sort tabs:** Distance · Rating · Price

**Provider response cards:**
```
[Avatar]  James Okafor                    2.3km away
          Gospel Trumpeter · ⭐ 4.8 (12)
          £100/hr · £150/gig               [ACCEPTED ✅]

          [VIEW PROFILE]  [SELECT →]

[Avatar]  Sarah Ade                       5.1km away
          Jazz Trumpeter · ⭐ 4.6 (8)
          Rates negotiable                 [Viewing... ⏳]

[Avatar]  Mark T.                         12km away
          Classical Trumpeter · ⭐ 4.2 (3)  [DECLINED ❌]
```

**"SELECT →" button:** Shows confirmation alert → `POST /api/gigs/:id/select` → pushes `UrgentGigConfirmationScreen`.

**Empty state:** "Waiting for responses — hang tight!"

**Expiry:** When `expires_at` passes and no provider selected, show "Your gig expired. No one accepted in time." + refund info.

---

### Screen 3.7 — UrgentGigConfirmationScreen (src/screens/UrgentGigConfirmationScreen.tsx)

After poster selects a provider:
```
✅ You've selected [James Okafor]

Gig: Trumpeter · Tonight 7:00 PM · Luton
Payment: £120 (held in escrow)

James will receive a confirmation notification.
You'll be notified when he confirms.

[Message James →]  (opens existing chat)
[View Gig Details]
```

---

### Screen 3.8 — ProviderGigDetailScreen (src/screens/ProviderGigDetailScreen.tsx)

**Entry:** Deep linked from push notification (`gig_id` in notification payload).

**Shows:**
```
🎺  (large instrument emoji / icon)

URGENT GIG
Trumpeter Needed Tonight

£120                          2.3km away
                              Luton Church
Gospel · 2 hours (7pm–9pm)
Tonight, Fri 21 Feb

Posted by:
[Avatar] Sarah M.  ⭐ 4.9 (12 reviews)

"We need a trumpeter for our worship night at..."
[See more]

[ACCEPT GIG]    [DECLINE]
[SEND MESSAGE]
```

**After ACCEPT:**
```
✅ You've accepted!

"Waiting for Sarah to review applications
(3 accepted, 2 pending)"

Realtime subscription updates this line.
```

**If confirmed (requester selected you):**
```
🎉 You've been selected!

Gig: Tonight 7pm · Luton Church
Payment: £105.60 (after 12% platform fee)

→ Navigate to OpportunityProjectScreen (reuse existing agreement + escrow flow)
```

**If not selected:**
```
😔 This gig was filled by another musician.
Keep your availability on to get the next one!
```

---

## Layer 4 — Realtime Subscriptions

**File to create:** `src/services/UrgentGigRealtimeService.ts`

### 4.1 Subscription: Requester watches gig responses
```typescript
// Channel: postgres_changes on gig_responses WHERE gig_id = X
// On INSERT or UPDATE: add/update provider card in UrgentGigResponsesScreen state
// Cleanup: unsubscribe on screen unmount or gig expiry
```

### 4.2 Subscription: Provider watches their gig status
```typescript
// Channel: postgres_changes on gigs WHERE id = X AND selected_provider_id = provider_id
// On UPDATE status → 'confirmed': show "🎉 You've been selected"
// On UPDATE status → 'cancelled'/'expired': show appropriate message
// Cleanup: unsubscribe when confirmed or gig ends
```

### 4.3 Subscription: My Opportunities screen — live interest count
```typescript
// Already possible with existing opportunity_responses table
// Subscribe to count changes for each active opportunity card
```

**Implementation note:** Use `supabase.channel()` pattern from the existing `realtimeService.ts` — follow the same singleton pattern already used in the project.

---

## Layer 5 — Enhancements to Existing Screens

### 5.1 OpportunityProjectScreen — additions

**A. 48-hour auto-release countdown (after delivered state)**
```tsx
// Show when status === 'delivered'
// Calculate: delivered_at + 48h = release_at
// Countdown timer: "Auto-releases in 47h 23m if not disputed"
// Use setInterval, update every minute
```

**B. Link to DisputeDetailScreen**
```tsx
// Replace current Alert-based dispute with:
navigation.navigate('DisputeDetail', { projectId, role });
```

**C. Rating prompt after completion**
```tsx
// When status transitions to 'completed', check if user has rated
// If not: show bottom sheet prompt "Leave a review for [name]?"
// [Leave Review] → navigation.navigate('PostGigRating', { projectId, ... })
// [Later] → dismiss with AsyncStorage flag for this projectId
```

**D. 24-hour confirmation reminder display**
```tsx
// When status === 'delivered' and delivered_at was > 23h ago:
// Show banner: "Please confirm the work was completed — auto-releases in [X]h"
```

### 5.2 CreateOpportunityScreen — add entry point

Replace existing direct entry with:
```tsx
// At the top of the opportunities tab / wherever user navigates to create:
// Route through UrgentGigTypeSelectionScreen first
// So user can choose: planned opportunity vs urgent gig
```

### 5.3 OpportunityCard — urgent badge

```tsx
// If opportunity.gig_type === 'urgent':
// Show 🔥 URGENT badge (red pill, top-left of card)
// Show countdown if expires_at within 2 hours: "Expires in 1h 23m"
// Show distance if available: "2.3km away"
```

### 5.4 MyOpportunitiesScreen — urgent gig tab

```tsx
// Add tab: "Urgent" alongside existing tabs
// List active urgent gigs
// Each shows: status, time remaining until gig date, # responses, selected provider
```

### 5.5 NotificationPreferencesScreen — urgent gig section

```tsx
// Add new section: "Urgent Gigs"
// Toggle: Urgent gig notifications
// Sub-toggle: Allow action buttons in notifications
```

---

## Layer 6 — Notification Deep Linking

### 6.1 Update DeepLinkingService.ts

Add handler for `urgent_gig` notification type:
```typescript
// In handleNotificationReceived:
if (data.type === 'urgent_gig') {
  navigation.navigate('ProviderGigDetail', { gigId: data.gig_id });
}
if (data.type === 'gig_accepted') {
  navigation.navigate('UrgentGigResponses', { gigId: data.gig_id });
}
if (data.type === 'gig_confirmed') {
  navigation.navigate('ProviderGigDetail', { gigId: data.gig_id });
}
if (data.type === 'gig_starting_soon') {
  // Show in-app reminder card or navigate to detail
}
```

### 6.2 Handle notification action buttons (background tap response)

Expo Notifications supports `setNotificationCategoryAsync` for action buttons. Register the `urgent_gig` category on app start:

```typescript
await Notifications.setNotificationCategoryAsync('urgent_gig', [
  { identifier: 'accept', buttonTitle: 'ACCEPT', options: { isDestructive: false } },
  { identifier: 'view', buttonTitle: 'VIEW DETAILS', options: { opensAppToForeground: true } },
  { identifier: 'decline', buttonTitle: 'DECLINE', options: { isDestructive: true } },
]);
```

Handle response in `NotificationService.ts`:
```typescript
// On 'accept' action: call UrgentGigService.respondToGig(gigId, { action: 'accept' })
// On 'decline': call UrgentGigService.respondToGig(gigId, { action: 'decline' })
// On 'view': navigate to ProviderGigDetailScreen
```

---

## Layer 7 — Wallet / Payment Connection

### 7.1 Verify wallet credit after project completion

After `confirm-delivery` succeeds on `OpportunityProjectScreen`:
```typescript
// 1. Re-fetch wallet balance (WalletService.getBalance())
// 2. Show toast: "£105.60 added to your wallet"
// 3. Navigate to WalletScreen if user taps toast (optional)
```

This is mostly backend (they trigger Stripe Transfer → wallet credit). Mobile just needs to refresh and display.

### 7.2 Add "View in Wallet" link from completed project

On `OpportunityProjectScreen` when `status === 'completed'`:
```tsx
<TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
  <Text>View payment in Wallet →</Text>
</TouchableOpacity>
```

### 7.3 Wallet transaction — show project reference

In `WalletScreen` transaction list, check if `transaction.reference_type === 'opportunity_project'` and link to the project:
```tsx
// If reference exists, show: "Gig: [project title]" → tap to navigate to project
```

---

## Layer 8 — Location Services Integration

### 8.1 GPS location update for urgent gig availability

**File:** `src/services/AvailabilityService.ts` (new, see Layer 2)

**When to update location:**
- When user toggles "Available for Urgent Gigs" ON
- Every 15 minutes while app is active AND availability is ON (use `AppState` listener)
- On app foreground if last update > 15 min ago

**Implementation:**
```typescript
import * as Location from 'expo-location';

// In AvailabilityService:
async updateCurrentLocation(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  await this.updateLocation(loc.coords.latitude, loc.coords.longitude);
  // POST /api/user/availability/location { lat, lng }
}
```

**Note:** Use `Accuracy.Balanced` (city-level) not `High` (GPS-level) to preserve battery. Update in background only when app is foregrounded.

### 8.2 Geocoding for "general area" mode

When user types an area name in `ProviderAvailabilityScreen`:
- Use Google Places API (key: `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` already in env)
- Call `https://maps.googleapis.com/maps/api/geocode/json?address=Luton&key=...`
- Parse result → lat/lng → save to `UserAvailability`

---

## Navigator Registration — New Screens to Add to App Navigator

Add all new screens to the main navigation stack (`App.tsx` or wherever the stack navigator is defined):

```typescript
<Stack.Screen name="UrgentGigTypeSelection" component={UrgentGigTypeSelectionScreen} />
<Stack.Screen name="CreateUrgentGig" component={CreateUrgentGigScreen} />
<Stack.Screen name="UrgentGigResponses" component={UrgentGigResponsesScreen} />
<Stack.Screen name="UrgentGigConfirmation" component={UrgentGigConfirmationScreen} />
<Stack.Screen name="ProviderGigDetail" component={ProviderGigDetailScreen} />
<Stack.Screen name="ProviderAvailability" component={ProviderAvailabilityScreen} />
<Stack.Screen name="PostGigRating" component={PostGigRatingScreen} />
<Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} />
```

---

## Build Order (Strict)

### Phase A — Can build NOW (no new backend needed)

| # | Screen / Task | Depends on |
|---|---|---|
| A1 | `DisputeDetailScreen` | Existing dispute endpoint |
| A2 | `PostGigRatingScreen` | Web team adds `gig_ratings` table + endpoint |
| A3 | `OpportunityProjectScreen` enhancements (countdown, rating prompt, wallet link) | Existing endpoints |
| A4 | TypeScript types (Layer 1 types) | Nothing |
| A5 | `GigRatingService.ts` | Web team rating endpoint |

### Phase B — Build once web team delivers availability API

| # | Screen / Task | Depends on |
|---|---|---|
| B1 | `AvailabilityService.ts` | `PATCH /api/user/availability` endpoint |
| B2 | `ProviderAvailabilityScreen` | B1 |
| B3 | Location update integration | B1 + expo-location |
| B4 | Notification category registration (action buttons) | Nothing (Expo API) |

### Phase C — Build once urgent gig backend endpoints are live

| # | Screen / Task | Depends on |
|---|---|---|
| C1 | `UrgentGigService.ts` | All gig endpoints live |
| C2 | `UrgentGigTypeSelectionScreen` | Nothing |
| C3 | `CreateUrgentGigScreen` | C1 + Stripe Payment Sheet |
| C4 | `UrgentGigResponsesScreen` | C1 + Supabase Realtime on gig_responses |
| C5 | `UrgentGigConfirmationScreen` | C1 |
| C6 | `ProviderGigDetailScreen` | C1 + deep link handler |
| C7 | `UrgentGigRealtimeService.ts` | Supabase Realtime on gig tables |
| C8 | Deep link notification handler updates | C6 |
| C9 | `OpportunityCard` urgent badge | `gig_type` field in API response |
| C10 | `MyOpportunitiesScreen` urgent tab | C1 |

### Phase D — Polish & integration

| # | Task |
|---|---|
| D1 | Wallet transaction → project reference link |
| D2 | "View in Wallet" from completed project |
| D3 | NotificationPreferencesScreen urgent gig section |
| D4 | End-to-end test: full urgent gig flow |
| D5 | End-to-end test: dispute + rating flow |

---

## Known Risks & Notes

1. **Stripe Payment Sheet in step 2** — already used in `OpportunityProjectScreen`, reuse the same pattern. Make sure `stripe_client_secret` is returned by the new `POST /api/gigs/urgent` endpoint.

2. **Google Places autocomplete** — `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is in env. Use `react-native-google-places-autocomplete` or the existing Google Places calls in the codebase if they exist.

3. **Supabase Realtime** — already set up in `src/services/realtime/realtimeService.ts`. Follow the same pattern.

4. **expo-location** — check if it's in `package.json`. If not, needs `npx expo install expo-location` and permission strings in `app.json`.

5. **Notification action buttons on iOS** — require `UNUserNotificationCenter` category registration. Expo handles this via `setNotificationCategoryAsync`. Test on real device only (simulators don't show action buttons).

6. **86% build credits** — we are close to the monthly EAS build limit. Build sparingly and test on device via Expo Go / dev build where possible before pushing to EAS.
