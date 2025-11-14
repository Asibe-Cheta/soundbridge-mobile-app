# Creator Type Expansion – Backend Coordination Request

**To:** Web App Team  
**From:** Mobile App Team  
**Date:** November 9, 2025

---

## 1. Background & Goals

We are preparing the SoundBridge mobile app to support the upcoming "Creator Type Expansion & Discovery Enhancement" initiative. The mobile client currently consumes data from Supabase tables founded by the web platform (`profiles`, `audio_tracks`, `events`, `creator_availability`, `tip_analytics`, etc.). Before we touch the app code, we need to make sure the mobile data layer will stay in lockstep with the canonical schema, endpoints, and business rules that the web app team stewards.

The proposed enhancements include:

- Allowing each user to hold **multiple creator types** simultaneously (beyond the existing musician/event organizer roles).
- Introducing **service provider profiles** with offerings, rates, portfolios, availability, and reviews.
- Upgrading the **Discover** and **Search** experiences to surface mixed content (tracks, events, services, venues) with filter pills.
- Preparing for later phases (venues, gear marketplace) without blocking the current release.

To proceed safely we need your guidance on schema, APIs, enums, and auth so we can mirror your implementation exactly.

---

## 2. Decisions & Clarifications Needed

### A. Database Schema

1. **Profiles / User Metadata**  
   - Preferred approach for storing multiple creator types per user?  
     - JSON array column (e.g. `creator_types text[]`),
     - Junction table (`user_creator_types`), or
     - Boolean flags (`is_musician`, `is_dj`, ...).  
   - Please confirm column/table names, data types, and indexes you plan to use.

2. **Service Provider Data Model**  
   - Should we create a dedicated `service_provider_profiles` table?  
   - Required fields (bio, categories, rates, availability, portfolio, verification state, etc.).  
   - Expected relationships (e.g. `service_provider_portfolio_items`, `service_provider_availability`).

3. **Venue Support (Phase 2)**  
   - Anticipated tables (`venues`, `venue_owner_profiles`?) and key columns so mobile can plan ahead.

4. **Reviews & Ratings**  
   - Is there an existing table we should reuse?  
   - Target schema (reviewer, reviewee, rating, comment, service reference, timestamps, moderation flags).

5. **Migrations / Defaults**  
   - How will we migrate existing creators? (e.g. default all current creators to `musician`.)  
   - Handling of current event organizers and any legacy fields.

### B. API Routes & Contracts

Please confirm or provide documentation for the following endpoints (URL, method, request/response payloads, auth scopes):

- **Creator type management**
  - `GET /api/users/{userId}/creator-types`
  - `POST /api/users/{userId}/creator-types`
  - `PATCH /api/users/{userId}/creator-types`
  - `DELETE /api/users/{userId}/creator-types/{type}`

- **Service provider lifecycle**
  - `GET /api/service-providers/{userId}`
  - `POST /api/service-providers`
  - `PATCH /api/service-providers/{userId}`
  - Portfolio CRUD (`/portfolio`), availability (`/availability`), bookings (`/bookings`).

- **Discovery & Search**
  - `GET /api/discover?category={all|music|events|services|venues}&limit=n`
  - `GET /api/search?query=...&type={all|music|events|services|venues}`

- **Reviews**
  - `GET /api/reviews/{providerId}`
  - `POST /api/reviews`
  - `PATCH /api/reviews/{reviewId}`
  - `DELETE /api/reviews/{reviewId}`

If you intend to reuse existing endpoints, please note any required payload changes or new query parameters.

### C. Data Models & Enums

Kindly share the finalized definitions (TypeScript, SQL, or Supabase generated types) for:

- `CreatorType` enum (current draft: `musician`, `podcaster`, `dj`, `event_organizer`, `service_provider`, `venue_owner`).
- `ServiceCategory` enum or lookup table (draft set includes: `sound_engineering`, `music_lessons`, `mixing_mastering`, `session_musician`, `photography`, `videography`, …).
- `ServiceProviderProfile` interface including structure for rates, portfolio entries, availability payload, rating aggregates, verification flags, and timestamps.
- `DiscoverItem` union type covering tracks, events, service providers, and future venues (discriminator field, shared fields, etc.).

### D. Authorization & Workflow Rules

1. Who can modify creator types—any authenticated user, only verified creators, or admin-only?  
2. Does a service provider require manual approval before appearing in discovery/search?  
3. Can listeners (non-creators) submit bookings or reviews, or is creator status required?  
4. Are there role-based restrictions we should enforce client-side (e.g. `service_provider` cannot remove their last required field)?

### E. Integration with Existing Systems

- **Notifications:** Should new booking/review/availability alerts plug into the current notification tables/topics? Any new event types we should anticipate?
- **Payments:** We currently integrate with Stripe for tipping. How should service bookings connect with existing payment flows (one-off charges, escrow, hold-over)?
- **Search/Indexing:** Will service providers and venues be indexed via existing search materialized views/functions, or will new views/functions be provided?

### F. Timeline & Deliverables

- Requested response within **3–5 business days** so we can scope mobile work for the next sprint.  
- We will **not** begin implementation until we receive:
  - ✅ Confirmed database schema & migration plan  
  - ✅ Endpoint specs & auth requirements  
  - ✅ Type definitions/enums  
  - ✅ Clarification on workflows (approval, notifications, payments)

Once we have your direction we will:

1. Mirror the agreed schema/enums in the mobile type system.  
2. Add or update API service modules for the new endpoints.  
3. Implement the UI/UX (mobile-optimized) following the shared data contracts.  
4. Coordinate QA to validate cross-platform consistency.

---

## 3. Supporting Context (Mobile State Today)

- Mobile currently assumes a single primary creator type derived from `profiles.tier` and displays music + events. No service provider artifacts exist yet.
- Discovery and search screens consume the `discover_feed_v1` and `search_content_v1` helpers provided previously; we will update those integrations once we know the new backend contracts.
- Authentication flows rely on Supabase session cookies plus REST endpoints proxied via `https://app.soundbridge.fm`. Any changes to auth strategy (e.g. additional scopes or RLS policies) must be flagged so we can adjust our `apiClient`.

---

## 4. Next Steps

Please reply with the requested details or point us to updated documentation/specs. If workshops or slack threads would accelerate alignment, we’re happy to schedule them.

Thank you for keeping the data layer cohesive across platforms!

— Mobile App Team

---

## 5. Web Team Response (November 11, 2025)

The web platform team confirmed the creator expansion backend is live. Key takeaways for mobile:

- **Schema:**
  - Creator type lookup and junction tables (`creator_type_lookup`, `user_creator_types`).
  - Full service provider stack: `service_provider_profiles`, `service_offerings`, `service_portfolio_items`, `service_provider_availability`, `service_reviews`, `provider_badge_history`.
  - Booking ecosystem: `service_bookings`, `booking_activity`, `booking_ledger`, `booking_notifications`, `provider_connect_accounts`.
  - Trigger functions for rating snapshots and badge refresh.
  - Early venue support via `venues` table.

- **APIs:**
  - REST endpoints under `/api/users/[userId]/creator-types` for managing creator roles.
  - Comprehensive `/api/service-providers` routes for profile CRUD, offerings, portfolio, availability, bookings, verification, badges, and reviews.
  - Booking actions (`/api/bookings`, `/payment-intent`, `/release`, `/dispute`) plus Stripe client-secret handoff.
  - Discovery/search endpoints updated to return service providers; existing Supabase views already extended.

- **Types & Enums:**
  - `CreatorType`, `ServiceCategory`, `ProviderBadgeTier`, booking status enums exported via `apps/web/src/lib/types.ts`.

- **Authorization:**
  - Authenticated listeners can browse and book; providers manage their own data; admins handle verification/disputes.
  - Stripe Connect account required before payments.

- **Notifications:**
  - Driven through `BookingNotificationService` with SendGrid templates; QA doc available.

- **Roadmap:**
  - Phase 7 admin disputes and expanded venue work pending; SMS/push strategy forthcoming.

### Mobile Follow-up Actions

1. **Type System Synchronization**  
   - Import/replicate `CreatorType`, `ServiceCategory`, `ProviderBadgeTier`, `BookingStatus`, and relevant interfaces.
   - Extend Supabase types (`Database` interface) with new tables/views/functions to ensure typed queries.

2. **API Client Modules**  
   - Add typed wrappers for creator type management, service provider lifecycle, bookings, verification, badges, and reviews.
   - Ensure bearer tokens/Supabase sessions are attached for all authenticated calls.

3. **State Management & Context**  
   - Update auth/profile contexts to store multiple creator types.  
   - Introduce service provider store (profile, offerings, availability, bookings, badge insights).

4. **Discover & Search UX**  
   - Integrate service provider cards (new "Services" tab plus mixed search results).  
   - Surface badges, rating, price band, trust flags from `/api/discover?tab=services` and extended views.

5. **Service Provider Profile Flows**  
   - Implement onboarding/editing UI mirroring web prerequisites.  
   - Display verification status, badge insights, trust settings, and reviews.

6. **Booking & Payments**  
   - Add booking request/payment flow using `/api/bookings` and Stripe PaymentSheet.  
   - Handle status transitions, cancellation/dispute messaging, and review eligibility.

7. **Testing & QA**  
   - Coordinate with QA using web team’s SendGrid testing playbook.  
   - Validate RLS scopes with multiple user types (listener, provider, admin service role).

We will proceed with implementation in phases and keep this document updated as milestones complete.
