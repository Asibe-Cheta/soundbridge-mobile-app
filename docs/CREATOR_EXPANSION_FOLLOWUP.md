# Creator Expansion Follow-Up – Mobile Implementation Status

**To:** Web Platform Team  
**From:** Mobile App Team  
**Date:** November 12, 2025

---

## 1. Work Completed on Mobile

We’ve pulled your “Creator Expansion” backend updates into the mobile client and confirmed the following pieces are now live:

- **Schema & Types:** `src/types/database.ts` and `src/types/index.ts` now mirror the new tables/enums (service providers, bookings, badges, reviews, venues). Mobile fetchers can access the same typed payloads you export from `apps/web/src/lib/types.ts`.
- **API Surface:** Added `src/services/creatorExpansionService.ts` that wraps the new REST endpoints for creator types, service provider lifecycle, bookings, verification, badges, and reviews. These helpers expect the same JSON shapes you documented.
- **Auth Context:** `AuthContext` now loads `user_creator_types` so we can detect multi-role users and expose `primary_creator_type` client-side.
- **Discovery UX:** `DiscoverScreen` includes a dedicated “Services” tab plus service results in global search (badges, ratings, trust flags, price band). Cards route to the creator profile for now.

All of the above is working off the real production APIs, and we’ve added fallbacks so Discover still renders when service data is sparse.

---

## 2. Remaining Gaps (Mobile Roadmap)

We want to close the remaining gaps so creators can complete the service-provider flow on mobile as well. Please confirm and/or supply the details called out below.

### A. Become a Service Provider – New Entry Point

- **Current state:** Mobile has no way to add the `service_provider` creator type. We understand the backend *does not yet* expose the “become a service provider” route.  
- **Request:** Please stand up a POST/PATCH endpoint (or confirm the canonical route if it already exists) that allows the current user to add/remove `service_provider` in `user_creator_types`. Include expected payload/response and any validation rules (e.g. prerequisites, rate limiting).  
- **Needed details:** route path, HTTP method(s), request body schema, success/error responses, auth scope/RLS behavior.

### B. Service Provider Profile Management

- **Goal:** Build a mobile UI so creators can create/update the service provider profile, offerings, portfolio, and availability.  
- **Questions:**
  - Can we reuse the same endpoints you listed (`/api/service-providers`, `/offerings`, `/portfolio`, `/availability`) with no additional params?  
  - Are there required fields beyond what’s documented (e.g. minimum prices, category constraints, file upload handling)?  
  - Do you have example payload templates we can plug into form defaults?  

### C. Verification Workflow & Badges

- **Goal:** Mirror the verification checklist, submission form, and badge insights on mobile.  
- **Confirm:** The existing routes (`/verification/status`, `/verification/request`, `/badges`) are complete. Please provide any additional guidance on prerequisites ordering, validation messages, or admin review transitions that the mobile client should surface.

### D. Booking & Payments (Consumer + Provider)

- **Goal:** Let listeners request services and let providers manage bookings/payments on mobile.  
- **Clarify:**
  - Expected request payload for `/api/bookings` (fields like `scheduledStart`, `currency`, `offeringId` already in use?).  
  - Stripe PaymentSheet data needed from `/payment-intent` and any special metadata we should pass back on confirmation.  
  - Provider-side status transitions (`confirm`, `decline`, `complete`) — do we simply call `/api/service-providers/[userId]/bookings/[bookingId]` with `{ action: 'confirm' }` or another shape?  
  - Any booking ledger/notification hooks we should be aware of when building optimistic UI (e.g. poll interval, webhooks).

### E. Recommendations & Search Details

- We’re consuming `discover_feed_v1` and `search_content_v1`. If additional filters/pagination becomes available for services, please flag the parameters so we can extend the UI.

---

## 3. Next Steps Requested

1. **Confirm the above endpoints are production-ready** and note any payload adjustments we should make before building the management UI.  
2. **Deliver route references** (path, method, payload) for the “become a service provider” action and any other flows where our understanding might diverge.  
3. **Highlight outstanding backend work** (if any) that could block the mobile roadmap — we will sequence our implementation accordingly.

Once we have your confirmation and the missing endpoint details, we’ll start on:

- Service-provider onboarding flow in profile settings.  
- Provider profile/offerings/availability editors.  
- Consumer booking + provider booking management flows.  
- Verification submission + badge insights UI.

Thank you! Let us know if you prefer a call/slack thread to walk through the screens before we start building.
