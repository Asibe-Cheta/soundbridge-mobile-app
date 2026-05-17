# SoundBridge — Urgent Gigs: Web Frontend Implementation Guide

**Date:** 2026-02-24
**Status:** Ready for web team implementation
**API Reference:** `MOBILE_TEAM_URGENT_GIGS_SCHEMA_AND_ENDPOINTS.md` (all endpoints, schema, push payloads)
**Backend Requirements:** `WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md`

This document describes every screen, component, data flow, and real-time subscription the web frontend needs to implement — covering all four phases (A–D) of the Urgent Gigs + Opportunity Enhancements feature. The mobile app has already implemented all of these phases; this guide gives the web team the same specification to build a feature-equivalent web experience.

---

## Contents

1. [Architecture Overview](#1-architecture-overview)
2. [TypeScript Type Definitions](#2-typescript-type-definitions)
3. [API Service Layer](#3-api-service-layer)
4. [Phase A — Dispute UI, Rating UI, Project Enhancements](#4-phase-a)
5. [Phase B — Provider Availability Settings](#5-phase-b)
6. [Phase C — Full Urgent Gig Flow](#6-phase-c)
7. [Phase D — Polish & Integration](#7-phase-d)
8. [Real-time Subscriptions](#8-real-time-subscriptions)
9. [Notification Deep Linking (Web)](#9-notification-deep-linking-web)
10. [Route Registration Summary](#10-route-registration-summary)
11. [Build Order](#11-build-order)

---

## 1. Architecture Overview

### 1.1 Relationship to existing Planned Opportunities flow

The existing Planned Opportunities system remains unchanged:

```
CreateOpportunityPage
  → POST /api/opportunities
  → OpportunityCard (feed)
  → ExpressInterestModal → POST /api/opportunities/{id}/interest
  → ProjectAgreementModal → Stripe hold
  → OpportunityProjectPage
     → Creator: accept/decline → mark delivered
     → Poster: confirm delivery OR dispute
  → Wallet
```

Urgent Gigs is a **parallel product** on the same backend tables. An urgent gig is an `opportunity_posts` row with `gig_type = 'urgent'`. IDs are the same UUIDs from `opportunity_posts.id`. **Do not change or remove anything in the Planned Opportunities flow.**

### 1.2 Key backend tables

| Table | Purpose |
|-------|---------|
| `opportunity_posts` | Gigs (both planned and urgent). Filter with `gig_type = 'urgent'` |
| `gig_responses` | Provider accept/decline responses per gig |
| `user_availability` | Provider availability settings (GPS, radius, rates, schedule, DND) |
| `gig_ratings` | Post-project ratings (mutual, blind until both submitted) |
| `disputes` | Full dispute lifecycle for both gig types |

### 1.3 Auth

All API calls require the same auth as the rest of the web app (Bearer token / session cookie). The only public endpoint is `GET /api/gig-ratings/user/:userId`.

### 1.4 All API endpoints at a glance

See `MOBILE_TEAM_URGENT_GIGS_SCHEMA_AND_ENDPOINTS.md` §3 for the full table with request/response shapes. Summary:

| Group | Endpoint |
|-------|---------|
| Availability | `GET/PATCH /api/user/availability`, `POST /api/user/availability/location` |
| Urgent gig lifecycle | `POST /api/gigs/urgent`, `GET /api/gigs/urgent/:id`, `GET /api/gigs/urgent/:id/responses`, `POST /api/gigs/:id/respond`, `POST /api/gigs/:id/select`, `POST /api/gigs/:id/complete` |
| Ratings | `POST /api/gig-ratings`, `GET /api/gig-ratings/project/:projectId`, `GET /api/gig-ratings/user/:userId` |
| Disputes | `POST /api/disputes`, `GET /api/disputes/:disputeId`, `POST /api/disputes/:disputeId/respond` |

---

## 2. TypeScript Type Definitions

Create these files in your types directory:

### 2.1 `types/urgent-gig.types.ts`

```typescript
export type GigStatus = 'searching' | 'confirmed' | 'completed' | 'cancelled';
export type GigResponseStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface UrgentGig {
  id: string;
  created_by: string;         // user_id of requester (opportunity_posts.user_id)
  gig_type: 'urgent' | 'planned';
  title: string;
  description?: string;
  skill_required: string;
  genre: string[];
  location_lat: number;
  location_lng: number;
  location_address: string;
  location_radius_km: number;
  date_needed: string;        // ISO datetime
  duration_hours: number;
  payment_amount: number;
  payment_currency: string;
  payment_status: 'pending' | 'escrowed' | 'released' | 'refunded';
  urgent_status: GigStatus;
  selected_provider_id?: string;
  project_id?: string;        // set by backend when confirmed
  expires_at: string;         // date_needed + 4h
  created_at: string;
  updated_at: string;
  // API-computed fields
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

### 2.2 `types/availability.types.ts`

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
  general_area_lat?: number;
  general_area_lng?: number;
  max_radius_km: number;          // default 20
  hourly_rate?: number;
  per_gig_rate?: number;
  rate_negotiable: boolean;
  availability_schedule: AvailabilitySchedule | null;
  dnd_start?: string;             // e.g. "23:00"
  dnd_end?: string;               // e.g. "08:00"
  max_notifications_per_day: number; // default 5
  last_location_update?: string;
  created_at: string;
  updated_at: string;
}
```

### 2.3 `types/gig-rating.types.ts`

```typescript
export interface GigRating {
  id: string;
  project_id: string;
  rater_id: string;
  ratee_id: string;
  overall_rating: number;             // 1–5 required
  professionalism_rating: number;     // 1–5 required
  punctuality_rating: number;         // 1–5 required
  quality_rating?: number;            // 1–5, provider-side only
  payment_promptness_rating?: number; // 1–5, requester-side only
  review_text?: string;               // max 1000 chars
  created_at: string;
}

export interface GigRatingProjectResult {
  both_submitted: boolean;
  has_rated: boolean;
  my_rating: GigRating | null;
  their_rating: GigRating | null;
}

export interface GigRatingUserResult {
  average_rating: number | null;
  total_reviews: number;
  ratings: Array<GigRating & { rater_profile?: { display_name: string; avatar_url?: string } }>;
}
```

### 2.4 `types/dispute.types.ts`

```typescript
export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_refund'
  | 'resolved_release'
  | 'resolved_split';

export interface Dispute {
  id: string;
  project_id: string;
  raised_by: string;
  against: string;
  reason: string;
  description: string;
  evidence_urls: string[] | null;
  status: DisputeStatus;
  counter_response: string | null;
  counter_evidence_urls: string[] | null;
  resolution_notes: string | null;
  split_percent: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // API-attached
  project?: any;
  raiser_profile?: { display_name: string; avatar_url?: string };
  against_profile?: { display_name: string; avatar_url?: string };
}
```

---

## 3. API Service Layer

Create three new API service modules. Each method follows the existing service pattern your web app uses.

### 3.1 `services/urgentGigService.ts`

```typescript
// POST /api/gigs/urgent
// Body: skill_required, date_needed, payment_amount, location_lat, location_lng
//       + optional: genre[], duration_hours, location_address, location_radius_km,
//                   payment_currency, description
// Response: { success: true, data: { gig_id, stripe_client_secret, estimated_matches } }
async function createUrgentGig(data: CreateUrgentGigInput): Promise<CreateUrgentGigResult>

// GET /api/gigs/urgent/:id
// Response: { success: true, data: UrgentGig }
async function getUrgentGig(gigId: string): Promise<UrgentGig>

// GET /api/gigs/urgent/:id/responses
// Requester only
// Response: { success: true, data: GigResponse[] }
async function getGigResponses(gigId: string): Promise<GigResponse[]>

// POST /api/gigs/:id/respond
// Body: { action: 'accept' | 'decline', message?: string }
// Response: { success: true }
async function respondToGig(gigId: string, action: 'accept' | 'decline', message?: string): Promise<void>

// POST /api/gigs/:id/select
// Body: { response_id: string }
// Response: { success: true, data: { project_id: string } }
async function selectProvider(gigId: string, responseId: string): Promise<{ project_id: string }>

// POST /api/gigs/:id/complete
// No body
// Response: { success: true, data: { released_amount: number, currency: string } }
async function completeGig(gigId: string): Promise<{ released_amount: number; currency: string }>
```

### 3.2 `services/availabilityService.ts`

```typescript
// GET /api/user/availability
// Creates default row if none exists
async function getMyAvailability(): Promise<UserAvailability>

// PATCH /api/user/availability
// Partial body — only send changed fields
async function updateAvailability(data: Partial<UserAvailability>): Promise<UserAvailability>

// POST /api/user/availability/location
// Body: { lat: number, lng: number }
async function updateLocation(lat: number, lng: number): Promise<void>
```

### 3.3 `services/gigRatingService.ts`

```typescript
// POST /api/gig-ratings
// Body: project_id, ratee_id, overall_rating, professionalism_rating, punctuality_rating
//       + optional: quality_rating, payment_promptness_rating, review_text
// 409 if already rated for this project
async function submitRating(data: SubmitRatingInput): Promise<void>

// GET /api/gig-ratings/project/:projectId
// Returns both ratings once both submitted; else has_rated + my_rating
async function getProjectRatings(projectId: string): Promise<GigRatingProjectResult>

// GET /api/gig-ratings/user/:userId — PUBLIC
// Returns average rating, total reviews, all visible ratings
async function getUserRatings(userId: string): Promise<GigRatingUserResult>
```

### 3.4 `services/disputeService.ts`

```typescript
// POST /api/disputes
// Body: project_id, reason, description, evidence_urls? (string[])
// Backend sets project status to 'disputed', notifies other party
// Response: { success: true, data: { dispute_id: string } }
async function raiseDispute(projectId: string, reason: string, description: string, evidenceUrls?: string[]): Promise<{ dispute_id: string }>

// GET /api/disputes/:disputeId
// Response: { success: true, data: Dispute & { project, raiser_profile, against_profile } }
async function getDispute(disputeId: string): Promise<Dispute>

// POST /api/disputes/:disputeId/respond
// Body: { response: string, counter_evidence_urls?: string[] }
// "Against" party only
async function respondToDispute(disputeId: string, response: string, counterEvidenceUrls?: string[]): Promise<void>
```

---

## 4. Phase A

**Phase A features can be built without any new backend work** — they only rely on endpoints and tables that were already present or added by the base urgent gigs migration.

### 4.1 DisputeDetailPage

**Route:** `/dispute/:projectId` (raise) | `/dispute/view/:disputeId` (view existing)
**Navigation to this page:** "Raise Dispute" button on OpportunityProjectPage. Also from an in-app notification (push `opportunity_project_disputed`).

This page has **four distinct states** — render the correct one based on loaded data.

---

**State A — Raise Dispute (initiator, no dispute yet)**

The user is here because they tapped "Raise a Dispute" on their project page.

UI layout:
```
Page header: "Raise a Dispute"

⚠️ Warning banner (red tint, glassmorphic)
  "Payment held securely"
  "{currency} {agreedAmount} will remain in escrow until this dispute
   is resolved by our team (typically within 48 hours)."

Project context card:
  Project: {projectTitle}
  Other party: {otherPartyName}

Section: "What's the issue?"
  Reason list (radio select, one at a time):
  • Work was not delivered as agreed
  • Quality does not match the brief
  • Creator is unresponsive
  • Deliverables are incomplete
  • Other

Section: "Describe the issue (min. 20 characters)"
  <textarea> placeholder: "Provide details about what went wrong,
    when it happened, and what was agreed..."
  Character count shown below

Section: "Evidence (optional, up to 3 images)"
  Image upload grid (90×90 thumbnails)
  Each thumbnail has an × remove button
  "+ Add photo" button (disabled at 3 images)
  Note: Upload images to Supabase Storage first (post-attachments bucket),
        then pass the returned public URLs in evidence_urls when calling POST /api/disputes

"What happens next?" info card:
  🛡️ Payment stays in escrow — no one receives funds until resolved
  ✉️ {otherPartyName} will be notified and given a chance to respond
  👥 Our team reviews within 48 hours and makes a fair decision
  💵 Funds are released or refunded based on the outcome

[Raise Dispute] button — red, disabled until reason selected + description ≥ 20 chars
  On click: confirmation dialog → POST /api/disputes → success → navigate to view state
```

Data flow:
1. Load `GET /api/gig-ratings/project/:projectId` to check if a dispute already exists (409 means one exists — redirect to view state).
2. On submit: upload evidence images → call `POST /api/disputes` with `project_id`, `reason`, `description`, `evidence_urls[]`.
3. On `{ success: true }` response: show success toast → navigate to dispute view.

---

**State B — Your submitted dispute (pending / under review)**

Load: `GET /api/disputes/:disputeId`. Show when `dispute.raised_by === currentUser.id`.

UI layout:
```
Page header: "Dispute Under Review"

Status badge: PENDING | UNDER REVIEW | RESOLVED (based on dispute.status)

"Your submission" card:
  Reason: {dispute.reason}
  Description: {dispute.description}
  Evidence: [thumbnail grid of dispute.evidence_urls]

Timeline:
  Dispute raised: {dispute.created_at formatted}
  Response deadline: {created_at + 72h formatted}
  Expected resolution: {created_at + 72h formatted}

Info banner:
  "Our team reviews all disputes within 48 hours.
   Payment is held securely until resolved."
```

---

**State C — Dispute raised against you**

Load: `GET /api/disputes/:disputeId`. Show when `dispute.against === currentUser.id` and `dispute.counter_response === null`.

UI layout:
```
Page header: "A Dispute Has Been Raised"

"[OtherPartyName] raised a dispute against this project:" card
  Reason: {dispute.reason}
  Their account: {dispute.description}
  Their evidence: [thumbnail grid of dispute.evidence_urls]

"Your response" section:
  <textarea> "Your side of the story..."
  [+ Add Evidence] — image uploader, up to 5 images

[Submit Response] button
  On click: upload any counter-evidence → POST /api/disputes/:disputeId/respond
  Body: { response: string, counter_evidence_urls?: string[] }
```

---

**State D — Resolved**

Show when `dispute.status` is one of: `resolved_refund | resolved_release | resolved_split`.

UI layout:
```
Page header: "Dispute Resolved"

Decision card (green/blue tint):
  resolved_refund  → "Full refund issued to requester"
  resolved_release → "Full payment released to provider"
  resolved_split   → "Payment split: {dispute.split_percent}% / {100 - dispute.split_percent}%"

Amount: {relevant figure formatted with currency}
Resolution notes: {dispute.resolution_notes if present}

"This decision is final."
```

---

### 4.2 PostGigRatingPage

**Route:** `/rate/:projectId`
**Navigation:** Shown automatically after `confirm-delivery` completes on OpportunityProjectPage.
**Props/params:** `projectId`, `rateeId`, `rateeName`, `rateeAvatarUrl`, `role: 'requester' | 'provider'`

**Check first:** `GET /api/gig-ratings/project/:projectId`. If `has_rated === true`, skip this page (user already rated).

UI layout:
```
[Avatar]  "How was your experience with [rateeName]?"

Overall         ★★★★★ (required)

Professionalism ★★★★★ (required)
Punctuality     ★★★★★ (required)

// Show only if role === 'provider' (rating the creator of the gig):
Quality of work ★★★★★ (optional)

// Show only if role === 'requester' (rating the provider):
Payment promptness ★★★★★ (optional)

[textarea] "Write a review... (optional)" — max 1000 characters

ℹ️ "You won't see their rating until both have submitted."

[Submit Rating] — disabled until required stars are selected
[Skip for now]
```

Star rating component: interactive, 1–5 selection. Tapping a filled star at position N sets rating to N.

On submit: `POST /api/gig-ratings` with:
```json
{
  "project_id": "...",
  "ratee_id": "...",
  "overall_rating": 5,
  "professionalism_rating": 4,
  "punctuality_rating": 5,
  "quality_rating": 4,        // provider only
  "payment_promptness_rating": 5, // requester only
  "review_text": "..."
}
```
On success: toast "Review submitted!" → navigate to project or feed.
On 409 (already rated): show "You've already rated this project" → navigate away.
On skip: store `{ rated_skipped: true }` in localStorage for `projectId` → navigate away.

---

### 4.3 OpportunityProjectPage enhancements

Add the following to the existing opportunity project page. These are incremental additions — do not rebuild the page.

**A. 48-hour auto-release countdown**

Show when `project.status === 'delivered'`:
```
⏱ "Auto-releases in 47h 23m if not disputed"
```
Logic: `release_at = delivered_at + 48h`. Display countdown as `Xh Ym`. Update every 60 seconds. If countdown reaches 0, the backend auto-releases; re-fetch and reflect `status === 'completed'`.

**B. 24-hour reminder banner**

Show when `project.status === 'delivered'` and `delivered_at` was > 23 hours ago:
```
🔔 Banner (amber tint): "Please confirm the work was completed — auto-releases in {X}h"
```

**C. Replace Alert-based dispute with navigation to DisputeDetailPage**

Replace:
```javascript
// OLD: Alert.alert('Raise a dispute...?', ...)
```
With:
```javascript
// NEW
router.push(`/dispute/${projectId}`)
// or pass params: { projectTitle, otherPartyName, agreedAmount, currency }
```

**D. Rating prompt after completion**

When `project.status` transitions to `'completed'`, check `GET /api/gig-ratings/project/:projectId`. If `has_rated === false`:

Show a bottom sheet / modal:
```
"Leave a review for [name]?"
★★★★★ [teaser star row — opens full rating page on tap]
[Leave Review]  [Later]
```

"Leave Review" navigates to `/rate/:projectId?rateeId=...&rateeName=...`.
"Later" stores `{ rating_prompted: true, project_id: ... }` in localStorage.

**E. "View in Wallet" link**

Show when `project.status === 'completed'` and current user is the provider:
```jsx
<a href="/wallet">
  🪙 View payment in Wallet →
</a>
```

---

## 5. Phase B

**Phase B requires the availability API** (`GET/PATCH /api/user/availability`).

### 5.1 ProviderAvailabilityPage

**Route:** `/settings/availability`
**Navigation:** Profile → Settings → "Urgent Gig Availability" link

Load on mount: `GET /api/user/availability`. Save all fields locally in form state. Save button calls `PATCH /api/user/availability` with changed fields only.

---

**Section A — Master toggle**

```
[Toggle] Available for Urgent Gigs
Subtitle: "When on, you'll receive real-time notifications
           for last-minute gigs near you."
```

Toggle `available_for_urgent_gigs`. When turned ON, trigger a geolocation permission request (see §8 Location).

All sections below (B–G) are only visible when the master toggle is ON.

---

**Section B — Location mode**

```
Radio buttons:
  ○ Use my current location (GPS)
  ● Use a general area

If "Use general area" selected:
  [Text input: city/area name]   [Use my location instead]
  On blur / enter: geocode the area name:
    GET https://maps.googleapis.com/maps/api/geocode/json
      ?address={encodeURIComponent(areaText)}
      &key={GOOGLE_PLACES_API_KEY}
    Parse result[0].geometry.location → { lat, lng }
    Store as general_area_lat, general_area_lng
```

If "Use current location" selected: call browser `navigator.geolocation.getCurrentPosition()` → store in `current_lat`, `current_lng` → also call `POST /api/user/availability/location` immediately.

---

**Section C — Travel radius**

```
Label: "How far will you travel?"

Segmented control or slider:
  5 km | 10 km | 20 km | 50 km | 100 km

Maps to: max_radius_km
```

---

**Section D — Your rates**

```
Hourly rate:  £ [number input]
Per gig rate: £ [number input]
[Checkbox] Rates are negotiable
```

Maps to: `hourly_rate`, `per_gig_rate`, `rate_negotiable`.

---

**Section E — Weekly availability schedule**

For each of 7 days (monday through sunday):

```
Monday    [Toggle on/off]

  If ON:
    ○ All day
    ● Specific hours:  From [HH:MM]  To [HH:MM]
```

Time inputs are standard `<input type="time">`. Store as `"HH:MM"` string (no seconds).

Schedule shape stored in `availability_schedule`:
```json
{
  "monday":    { "available": true,  "hours": "18:00-23:00" },
  "tuesday":   { "available": false },
  "wednesday": { "available": true,  "hours": "all_day" },
  ...
}
```

---

**Section F — Daily notification limit**

```
Max urgent gig notifications per day:
[-] 3 [+]   (stepper, range 1–10, default 5)
```

Maps to: `max_notifications_per_day`.

---

**Section G — Do Not Disturb**

```
Don't send notifications:
From [HH:MM input, e.g. 23:00]  To [HH:MM input, e.g. 08:00]

Note: "Times are in your local timezone"
```

Maps to: `dnd_start`, `dnd_end`.

---

**Save behaviour**

```
[Save Availability Settings]
```

On click: `PATCH /api/user/availability` with the full current form state (or a diff — either works; backend handles partial).
On success: toast "Availability saved" + optimistic update.
On error: show error message.

**Important:** Do not save automatically on each toggle — only on explicit Save tap.

---

## 6. Phase C

**Phase C requires all urgent gig backend endpoints to be live.**

### 6.1 GigTypeSelectionPage

**Route:** `/gigs/new`
**Navigation:** "Post a Gig" button in feed, opportunities tab, or profile.

This is a simple entry-point selection page — replace any direct navigation to `CreateOpportunityPage`.

UI layout:
```
Page heading: "What type of gig?"

Two large cards (full-width, stacked or side by side on desktop):

┌─────────────────────────────────────────────┐
│  📋  Planned Opportunity                    │
│  Plan a collaboration, event, or job.       │
│  No rush — set your own timeline.           │
│                                             │
│                          [Post Opportunity →]│
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  🔥  Urgent Gig                             │
│  Need someone today or tonight.             │
│  Last-minute, location-based matching.      │
│                                             │
│                          [Post Urgent Gig →] │
└─────────────────────────────────────────────┘
```

"Post Opportunity →" navigates to the existing `/opportunities/create` page.
"Post Urgent Gig →" navigates to `/gigs/urgent/create`.

---

### 6.2 CreateUrgentGigPage (3-step)

**Route:** `/gigs/urgent/create`

Show a step progress indicator at the top: `● 1  — 2  — 3` → `✓ 1  ● 2  — 3` etc.

---

**Step 1 — Details**

```
Skill needed [searchable select dropdown]:
  Trumpeter, Vocalist, Drummer, DJ, Sound Engineer,
  Pianist, Guitarist, Bassist, Violinist, Saxophonist,
  Vocal Coach, Music Producer, Choir Director, Percussionist,
  Backing Singer, MC/Host, Other

Genre (select all that apply) [chip multi-select]:
  Gospel | Jazz | R&B | Classical | Afrobeats | Hip-Hop
  Pop | Rock | Soul | Country | Worship | Latin | Electronic | Other

Date & Time [datetime-local input]
  Validation: must be ≥ 1 hour from now

Duration [range slider: 1–8 hours, step 0.5]
  Display: "{value} hours" or "30 minutes" for 0.5

Location [Google Places Autocomplete text input]
  On select: store { location_address, location_lat, location_lng }

Search radius [segmented: 5km | 10km | 20km | 50km | 100km]
  Default: 20km
  Maps to: location_radius_km

Payment amount [number input]
  Currency [select: GBP | USD | EUR | NGN]

Description [textarea, optional, max 500 chars]
  Character count below

[Continue →] — disabled until required fields complete
```

Validation before Step 2:
- `skill_required` selected
- `date_needed` ≥ 1h from now
- `location_lat` and `location_lng` set (from Places Autocomplete)
- `payment_amount` > 0

---

**Step 2 — Payment**

Show a summary card first:
```
┌──────────────────────────────────────────┐
│ 🎺  Trumpeter — Tonight 7:00 PM          │
│ Gospel · 2 hours · Luton area (20km)     │
│ £120                                     │
└──────────────────────────────────────────┘

"This amount will be held securely in escrow
until the service is confirmed complete."

Platform fee (12%):  — £14.40
You pay:             £120.00
Creator receives:    £105.60

[Stripe Payment Element or Stripe Checkout]

[Confirm & Pay →]
```

Payment flow:
1. On "Confirm & Pay": call `POST /api/gigs/urgent` with all details from Step 1.
2. Response: `{ gig_id, stripe_client_secret, estimated_matches }`.
3. Use `stripe_client_secret` to initialise Stripe's Payment Element (`stripe.confirmPayment()`).
4. On payment success (Stripe redirects or `stripe.confirmPayment` resolves `succeeded`): navigate to Step 3.
5. On payment failure: show Stripe error, stay on Step 2.

Store `gig_id` in state for Step 3.

**Note:** Use Stripe.js (`@stripe/stripe-js`) + `@stripe/react-stripe-js` on the web. The `stripe_client_secret` is a PaymentIntent client secret (`pi_xxx_secret_xxx`). Use `stripe.confirmPayment({ elements, confirmParams: { return_url: ... } })` or the newer Payment Element flow.

---

**Step 3 — Searching (real-time)**

```
[Animated radar / pulse graphic — CSS animation or Lottie]

"🔍 Finding the best trumpeters near you..."

→ After POST /api/gigs/urgent responded with estimated_matches:
"✅ Notified {estimated_matches} musicians nearby"
"Accepting responses now — usually fills in minutes"

[View Responses →]  (navigates to GigResponsesPage — show once ≥ 1 accepted)
[Cancel Gig]        (calls DELETE or cancels — ask backend for cancel endpoint;
                     redirects to feed on success)
```

Subscribe to real-time updates on `gig_responses` for `gig_id` (see §8 Real-time). As responses come in, show a live count: `"3 musicians responded"`.

Once at least 1 response has `status === 'accepted'`, enable the "View Responses →" button.

---

### 6.3 GigResponsesPage

**Route:** `/gigs/:gigId/responses`
**Auth:** Requester only.

Load:
- `GET /api/gigs/urgent/:id` — gig details for header
- `GET /api/gigs/urgent/:id/responses` — initial provider list

Subscribe to Supabase Realtime on `gig_responses` where `gig_id = :id` (see §8.1).

---

**Header:**

```
← Back

[Skill icon] Urgent Gig — {skill_required}
{date_needed formatted, e.g. "Tonight, 7:00 PM"}

Expires: {countdown from expires_at, e.g. "1h 23m remaining"}
```

---

**Sort tabs:**

```
[ Distance ] [ Rating ] [ Price ]
```

Default: Distance.

---

**Provider response cards:**

```
┌─────────────────────────────────────────────────────┐
│ [Avatar]  James Okafor                 2.3km away   │
│           Gospel Trumpeter · ⭐ 4.8 (12)             │
│           £100/hr · £150/gig     [ACCEPTED ✅]       │
│                                                     │
│  "I'm available and have experience with…"          │
│                                                     │
│  Response time: 4 minutes                          │
│                                                     │
│  [VIEW PROFILE]              [SELECT →]             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ [Avatar]  Sarah Ade                    5.1km away   │
│           Jazz Trumpeter · ⭐ 4.6 (8)                │
│           Rates negotiable         [Viewing... ⏳]   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ [Avatar]  Mark T.                     12km away     │
│           Classical Trumpeter · ⭐ 4.2 (3)  [DECLINED ❌] │
└─────────────────────────────────────────────────────┘
```

Status badge colours:
- `accepted` → green `ACCEPTED ✅`
- `pending` → grey `Viewing... ⏳`
- `declined` → red `DECLINED ❌`
- `expired` → muted `EXPIRED`

Only show `[SELECT →]` button on cards with `status === 'accepted'`.

**On SELECT click:**
1. Show confirmation dialog: "Select James Okafor for this gig? You won't be able to change your selection."
2. On confirm: `POST /api/gigs/:id/select` with `{ response_id: response.id }`.
3. On success: receive `{ project_id }` → navigate to `/gigs/:gigId/confirmation?projectId={project_id}`.

**Empty state:** `"Waiting for responses — hang tight! Musicians have been notified."`

**Expiry state (expires_at passed, no selection made):**
```
⚠️ "Your gig expired. No musicians accepted in time."
   "Your payment has been refunded — usually within 3–5 business days."
[Post a new gig]
```

---

### 6.4 GigConfirmationPage

**Route:** `/gigs/:gigId/confirmation`

```
✅  "You've selected James Okafor!"

Gig summary card:
  Trumpeter · Tonight 7:00 PM · Luton Church
  Payment: £120 (held in escrow)

"James will receive a confirmation notification.
You'll both receive a reminder 1 hour before the gig."

[Message James →]       (opens existing chat)
[View Gig Project →]    (navigates to /projects/:projectId once confirmed)
[Back to Feed]
```

Note: The project is created by the backend on `POST /api/gigs/:id/select`. The `project_id` is in the URL params. Link to the existing OpportunityProjectPage using this ID.

---

### 6.5 ProviderGigDetailPage

**Route:** `/gigs/:gigId/detail`
**Navigation:** Deep-linked from push notification (`urgent_gig`, `gig_confirmed` types) OR from provider's "My Gigs" tab.

Load on mount: `GET /api/gigs/urgent/:id`.

Subscribe to Supabase Realtime on `opportunity_posts` where `id = :gigId` (see §8.2).

This page renders one of **five states** based on `gig.urgent_status` + `gig.selected_provider_id` vs current user:

---

**State 1 — Searching (provider has not yet responded)**

```
🎺  (large skill icon or instrument emoji)

  URGENT GIG
  Trumpeter Needed Tonight

  £120                              2.3km away
                                    Luton Church
  Gospel · 2 hours (7:00 PM – 9:00 PM)
  Tonight, Fri 21 Feb

Posted by:
  [Avatar] Sarah M.  ⭐ 4.9 (12 reviews)

"We need a trumpeter for our worship night at Luton Church..."
[Show more]

[Expires in: 1h 23m]

[ACCEPT GIG]          [DECLINE]
```

On ACCEPT: `POST /api/gigs/:id/respond` with `{ action: 'accept' }` → switch to State 2.
On DECLINE: `POST /api/gigs/:id/respond` with `{ action: 'decline' }` → show "You've declined this gig" → navigate back.

Optional message field: show a small textarea "Add a message (optional)" before confirming accept.

---

**State 2 — Provider accepted, waiting for requester to choose**

```
✅  "You've accepted!"

"Waiting for Sarah to review applications
({n} accepted, {m} pending)"

"You'll be notified if you're selected."

Gig details still visible below.
```

Realtime subscription updates the accepted/pending counts in real time.

---

**State 3 — You were selected (confirmed)**

Show when `gig.urgent_status === 'confirmed'` AND `gig.selected_provider_id === currentUser.id`.

```
🎉  "You've been selected!"

Gig: Trumpeter · Tonight 7:00 PM · Luton Church
Your earnings: £105.60 (after 12% platform fee)

[View Gig Project →]
  → navigates to /projects/:projectId
    (project_id is in gig.project_id)
```

---

**State 4 — Gig was filled by someone else**

Show when `gig.urgent_status === 'confirmed'` AND `gig.selected_provider_id !== currentUser.id`.

```
😔  "This gig was filled by another musician."

"Keep your availability on to get the next one!"

[Update Availability →]     [Back to Feed]
```

---

**State 5 — Cancelled**

Show when `gig.urgent_status === 'cancelled'`.

```
❌  "This gig was cancelled."

"The requester cancelled or no one accepted in time.
Any payment has been refunded."

[Browse other gigs]
```

---

### 6.6 OpportunityCard — urgent badge

On any OpportunityCard (feed, search, opportunities list) where `opportunity.gig_type === 'urgent'`:

```
┌────────────────────────────────────┐
│ 🔥 URGENT                          │  ← red pill badge, top-left
│                                    │
│  Trumpeter Needed Tonight          │
│  £120 · 2.3km · Luton              │
│  Expires in 1h 23m                 │  ← show if expires_at ≤ 2h from now
└────────────────────────────────────┘
```

Badge: bright red pill, white text, `🔥 URGENT`.
Countdown: only show if `expires_at` is within 2 hours. Use `setInterval` every 60s to update.
Distance: show `distance_km` if present in API response.

---

### 6.7 MyOpportunitiesPage — Urgent tab

Add an "Urgent" tab alongside the existing tabs on the user's opportunities list page.

```
[ All ]  [ Active ]  [ Urgent ]  [ Completed ]
```

Urgent tab content:

```
[+ Post Urgent Gig]

Active urgent gigs:
┌──────────────────────────────────────────────────┐
│ 🔥 Trumpeter Needed Tonight                      │
│ Status: Searching                                │
│ Gig time: Tonight 7:00 PM                       │
│ 3 responses · 1 accepted                         │
│ Expires in: 1h 23m                               │
│                          [View Responses →]      │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ 🎸 Guitarist for Event                           │
│ Status: Confirmed — James Okafor                 │
│ Gig time: Tomorrow 6:00 PM                      │
│ Payment: £200 in escrow                          │
│                          [View Project →]        │
└──────────────────────────────────────────────────┘
```

Card shows: `urgent_status`, time until gig, response count, selected provider if confirmed.
"View Responses →" navigates to GigResponsesPage.
"View Project →" navigates to OpportunityProjectPage (using `gig.project_id`).

---

## 7. Phase D

### 7.1 Wallet transaction — project link

In the wallet transactions list, if a transaction has `reference_type === 'opportunity_project'` and `reference_id` is set:

```jsx
<tr onClick={() => router.push(`/projects/${transaction.reference_id}`)}>
  <td>{transaction.description}</td>
  <td>{transaction.amount}</td>
  <td style={{ color: 'blue', cursor: 'pointer' }}>View project →</td>
</tr>
```

The `reference_type` and `reference_id` fields are returned by the wallet transactions API when a wallet credit was triggered by a gig completion. Only show the link if both fields are present.

### 7.2 "View in Wallet" — from completed project

On OpportunityProjectPage, when `project.status === 'completed'` and current user is the provider (creator who received payment):

```jsx
<a href="/wallet">🪙 View payment in Wallet →</a>
```

This was covered in §4.3-E above. Repeating here for completeness.

### 7.3 Notification preferences — urgent gig toggles

Add a new section to the Notification Preferences settings page:

```
─────────────────────────────────────
🔥 Urgent Gigs
─────────────────────────────────────

[Toggle] Urgent Gig Alerts
  "Get notified when there's a last-minute gig near you that
   matches your skills."

[Toggle] Notification Action Buttons        ← disabled when Alerts toggle is OFF
  "Allow quick Accept/Decline buttons
   directly in the notification."
```

Persist these settings to the user's notification preferences in your existing preferences table/API. Field names used by the mobile app (for consistency):

- `urgentGigNotificationsEnabled` (boolean)
- `urgentGigActionButtonsEnabled` (boolean)

When the "Urgent Gig Alerts" toggle is turned OFF, automatically disable and grey out the "Action Buttons" toggle.

---

## 8. Real-time Subscriptions

Use Supabase's `postgres_changes` feature (same client your web app already uses).

### 8.1 Requester — watching responses (GigResponsesPage)

```typescript
const channel = supabase
  .channel(`gig-responses-${gigId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'gig_responses',
      filter: `gig_id=eq.${gigId}`,
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        // Add new provider card to list
        setResponses((prev) => [...prev, payload.new as GigResponse]);
      } else if (payload.eventType === 'UPDATE') {
        // Update existing card status (e.g. pending → accepted)
        setResponses((prev) =>
          prev.map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r))
        );
      }
    }
  )
  .subscribe();

// Cleanup on unmount:
return () => { supabase.removeChannel(channel); };
```

### 8.2 Provider — watching gig status (ProviderGigDetailPage)

```typescript
const channel = supabase
  .channel(`gig-status-${gigId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'opportunity_posts',
      filter: `id=eq.${gigId}`,
    },
    (payload) => {
      const updated = payload.new as UrgentGig;
      setGig(updated);
      // deriveState will re-render the correct state panel
    }
  )
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

### 8.3 State derivation on gig update

```typescript
function deriveViewState(gig: UrgentGig, currentUserId: string): ProviderViewState {
  if (gig.urgent_status === 'cancelled') return 'cancelled';
  if (gig.urgent_status === 'confirmed' || gig.urgent_status === 'completed') {
    if (gig.selected_provider_id === currentUserId) return 'confirmed';
    return 'filled'; // selected but not this user
  }
  // status === 'searching'
  // check user's own gig_response
  return 'searching'; // or 'waiting' if they have already accepted
}
```

**Important:** Never show "You've been selected!" to a provider who responded but was not selected. Always compare `gig.selected_provider_id === currentUser.id` before showing the confirmed state.

---

## 9. Notification Deep Linking (Web)

For web push notifications (if implemented via the Web Push API or Supabase edge functions), handle these `data.type` values in your notification click handler:

| `data.type` | Action |
|-------------|--------|
| `urgent_gig` | Navigate to `/gigs/${data.gig_id}/detail` |
| `gig_accepted` | Navigate to `/gigs/${data.gig_id}/responses` |
| `gig_confirmed` | Navigate to `/gigs/${data.gig_id}/detail` (provider sees "selected" state) |
| `gig_starting_soon` | Navigate to `/gigs/${data.gig_id}/detail` or `/projects/${data.project_id}` |
| `confirm_completion` | Navigate to `/projects/${data.project_id}` |
| `gig_filled` | Show toast "This gig was filled" (no navigation needed) |
| `rating_prompt` | Navigate to `/rate/${data.project_id}?rateeId=${data.ratee_id}&rateeName=${data.ratee_name}` |
| `opportunity_project_completed` | Navigate to `/projects/${data.project_id}` |
| `opportunity_project_disputed` | Navigate to `/dispute/view/${data.dispute_id}` (if in notification metadata) |

See `MOBILE_TEAM_URGENT_GIGS_SCHEMA_AND_ENDPOINTS.md` §4 for full push payload shapes.

---

## 10. Route Registration Summary

Register all new routes in your web app router:

```
/gigs/new                           → GigTypeSelectionPage
/gigs/urgent/create                 → CreateUrgentGigPage
/gigs/:gigId/responses              → GigResponsesPage (requester)
/gigs/:gigId/confirmation           → GigConfirmationPage
/gigs/:gigId/detail                 → ProviderGigDetailPage (provider)
/settings/availability              → ProviderAvailabilityPage
/rate/:projectId                    → PostGigRatingPage
/dispute/:projectId                 → DisputeDetailPage (raise flow)
/dispute/view/:disputeId            → DisputeDetailPage (view existing)
```

Existing routes modified (no new route, additions only):
- `/projects/:projectId` — OpportunityProjectPage (countdown, dispute link, rating prompt, wallet link)
- `/wallet` — WalletPage (tappable transactions with project reference)
- `/settings/notifications` — NotificationPreferencesPage (urgent gig section)
- `/opportunities` or `/gigs/my` — MyOpportunitiesPage (Urgent tab)

---

## 11. Build Order

Follow the same phased approach as the mobile team. Each phase can start independently once its backend dependency is met.

### Phase A — Build now (no new backend needed beyond base migration)

| # | Task | Notes |
|---|------|-------|
| A1 | Type definitions (§2) | No dependencies |
| A2 | `disputeService.ts` + DisputeDetailPage (all 4 states) | Needs existing disputes table |
| A3 | `gigRatingService.ts` + PostGigRatingPage | Needs `gig_ratings` table + endpoint |
| A4 | OpportunityProjectPage enhancements (§4.3) | Countdown, dispute link, rating prompt, wallet link |

### Phase B — After availability API is live

| # | Task | Notes |
|---|------|-------|
| B1 | `availabilityService.ts` | `GET/PATCH /api/user/availability` |
| B2 | ProviderAvailabilityPage | After B1 |
| B3 | Location update on toggle ON | Browser Geolocation API |

### Phase C — After all urgent gig endpoints are live

| # | Task | Notes |
|---|------|-------|
| C1 | `urgentGigService.ts` | All gig endpoints |
| C2 | GigTypeSelectionPage | No dependencies |
| C3 | CreateUrgentGigPage (3 steps + Stripe) | C1 + Stripe.js |
| C4 | GigResponsesPage + Supabase Realtime §8.1 | C1 |
| C5 | GigConfirmationPage | C1 |
| C6 | ProviderGigDetailPage (all 5 states) + Realtime §8.2 | C1 |
| C7 | OpportunityCard urgent badge | `gig_type` field in API response |
| C8 | MyOpportunitiesPage — Urgent tab | C1 |
| C9 | Notification deep-link handler (§9) | C6 |

### Phase D — Polish

| # | Task | Notes |
|---|------|-------|
| D1 | Wallet transaction project links | `reference_type/reference_id` in transaction API |
| D2 | "View in Wallet" from completed project | Already in §4.3-E |
| D3 | Notification preferences — urgent gig toggles | Existing prefs page/API |

---

## Appendix: Key behaviours to match

1. **Evidence images must be uploaded to storage before calling `POST /api/disputes`.**
   Upload to your Supabase Storage `post-attachments` bucket, get back a public URL, then pass `evidence_urls: [url1, url2]` in the dispute body.

2. **Ratings are mutual and blind.**
   Neither party sees the other's rating until both have submitted. On `GET /api/gig-ratings/project/:projectId`, `both_submitted` is the flag. Only show `their_rating` if `both_submitted === true`.

3. **`selected_provider_id` check is mandatory.**
   All accepting providers receive a `gig_confirmed` push when the requester selects *anyone* — but only the selected provider should see the "You've been selected!" UI. Always gate this on `gig.selected_provider_id === currentUser.id`.

4. **`project_id` comes from the select endpoint.**
   `POST /api/gigs/:id/select` returns `{ project_id }`. Store this and use it to navigate to the OpportunityProjectPage for the full project flow (agreement, delivery, completion, dispute, rating).

5. **Stripe PaymentIntent is a hold, not a charge.**
   The backend creates a `capture_method: 'manual'` PaymentIntent. The user's card is authorised (held) at creation time. The actual charge happens on `POST /api/gigs/:id/complete` when the backend captures. If the gig expires or is cancelled, the backend cancels the intent (automatic refund within 3–5 business days).

6. **Do not break the existing Planned Opportunities flow.**
   Urgent gigs are additive. Both product types co-exist on the same `opportunity_posts` table, differentiated by `gig_type`. Existing opportunity cards, project pages, and agreement flows must continue working exactly as before.
