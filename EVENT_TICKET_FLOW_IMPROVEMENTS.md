# Event Ticket Flow Improvements

Gaps identified by comparing the current SoundBridge events flow against Eventbrite.
Tasks are ordered by priority. Mobile tasks are tracked here; backend tasks are documented separately in `WEB_TEAM_EVENT_TICKET_EMAIL.md`.

---

## Mobile Tasks

### ✅ = Done | 🔲 = To Do

---

### 1. ✅ Post-Purchase Confirmation Screen
**File to create:** `src/screens/TicketConfirmationScreen.tsx`

Replace the current `Alert.alert()` after a successful ticket purchase with a full-screen confirmation page.

**Must include:**
- Green checkmark / success animation
- Order number (from `ticket.ticket_code` or a dedicated `order_id` field)
- Event name, date, time, location
- "Ticket sent to [user email]" line
- QR code preview (small, tappable to go full screen)
- CTA: "View My Ticket" → navigates to TicketWalletScreen
- Secondary: "Back to Event"

**Navigation change:**
- In `EventDetailsScreen.tsx`, after `confirmTicketPurchase()` succeeds, navigate to `TicketConfirmationScreen` instead of calling `Alert.alert`.

---

### 2. ✅ Ticket Wallet Screen (My Tickets)
**File to create:** `src/screens/TicketWalletScreen.tsx`

A dedicated screen where users can view all their purchased event tickets.

**Must include:**
- List of all tickets from `EventTicketService.getAllUserTickets()`
- Each ticket card: event cover image, event name, date/time, venue, ticket code, status badge (Active / Used)
- Tapping a ticket opens a full-screen ticket view with:
  - Large QR code (generated from `EventTicketService.generateTicketQRData()`)
  - Event name, date, time, venue
  - Ticket code in text (below QR)
  - "Share Ticket" button
- Empty state: "No tickets yet — browse events to get started"

**Navigation:**
- Add "My Tickets" entry point from ProfileScreen (or Settings) and from the post-purchase confirmation screen
- Register `TicketWalletScreen` in the app navigator

---

### 3. 🔲 End Time on Events
**File:** `src/screens/EventDetailsScreen.tsx`

Events currently only show a start time. Add end time display.

**What's needed:**
- Add `end_date` / `end_time` field to the `Event` interface (fetch from DB if it exists)
- Update `formatDate` display: "Sunday, 15 March · 5pm – 8pm"
- If `end_time` is missing, show just start time as now

---

### 4. 🔲 Save / Favourite an Event
**Files:** `src/screens/EventDetailsScreen.tsx`, `src/screens/AllEventsScreen.tsx`

Eventbrite shows a heart icon on the event detail page. Users expect to save events.

**What's needed:**
- Heart/bookmark icon in the event detail header (next to share)
- Toggle saved state via `event_saves` table (or reuse existing saves pattern)
- Saved events accessible from Profile → Saved

---

### 5. 🔲 Multiple Ticket Tiers (Standard / VIP)
**Files:** `src/screens/EventDetailsScreen.tsx`, `src/services/EventTicketService.ts`

Currently we support a single price per event. Organisers need Standard and VIP tiers.

**What's needed:**
- Schema: `event_ticket_tiers` table (`id`, `event_id`, `name`, `price_gbp`, `price_ngn`, `quantity`, `quantity_sold`, `description`)
- UI: Ticket tier selector before "Buy Ticket" — show each tier as a card with name, description, price, availability
- Price range display: "£15 – £35" instead of single price
- `createTicketPaymentIntent` updated to accept `tierId`
- "Early bird" flag per tier (optional)

---

### 6. 🔲 Urgency Signal ("Sales End Soon")
**File:** `src/screens/EventDetailsScreen.tsx`

Show a "Sales End Soon" badge when:
- Event is within 48 hours, OR
- Tickets are ≥ 80% sold (if `max_attendees` is set)

---

### 7. 🔲 Organiser Follow Button on Event Page
**File:** `src/screens/EventDetailsScreen.tsx`

The organiser section currently shows avatar + name only.

**What's needed:**
- Add a Follow/Following toggle button beside the organiser name
- Use the existing follow API
- Show organiser follower count (from `profiles.followers_count`)

---

### 8. 🔲 Highlights Card
**File:** `src/screens/EventDetailsScreen.tsx`

Add a "Good to know" section above the description:
- Duration (if `end_time` available: auto-calculated)
- Age restriction (`age_restriction` field on event, e.g. "All ages", "18+")
- Format: In Person / Online / Hybrid
- Doors open time (separate from event start, if provided)
- Refund policy (free text or enum: "No refunds", "Up to 24hrs before")

Requires minor schema additions to `events` table.

---

### 9. 🔲 Related Events ("You might also like")
**File:** `src/screens/EventDetailsScreen.tsx`

At the bottom of the event detail page, show 3–4 events in the same category or city.

**Query:**
```sql
SELECT * FROM events
WHERE (category = $1 OR location ILIKE $2)
  AND id != $3
  AND event_date > NOW()
ORDER BY event_date ASC
LIMIT 4;
```

---

### 10. 🔲 Checkout Countdown Timer
**File:** `src/screens/EventDetailsScreen.tsx`

When the Stripe payment sheet is open, a timer isn't visible to the user — this is handled by Stripe's sheet natively. However, we can add a brief "complete payment within 10 minutes" note before the sheet opens, to set expectations.

---

## Backend Tasks (documented in `WEB_TEAM_EVENT_TICKET_EMAIL.md`)

- `POST /api/events/confirm-ticket-purchase` → trigger confirmation email with ticket PDF attachment
- Email template: order number, event details, QR code image, calendar add link
- PDF ticket generation (event name, date, venue, QR code, order number, attendee name)
- `event_ticket_tiers` table + related API changes
- `events` table additions: `end_date`, `age_restriction`, `event_format`, `doors_open_time`, `refund_policy`

---

## Order of Execution

| # | Task | Scope |
|---|------|-------|
| 1 | Post-Purchase Confirmation Screen | Mobile |
| 2 | Ticket Wallet Screen | Mobile |
| 3 | End time on events | Mobile |
| 4 | Save / Favourite event | Mobile |
| 5 | Ticket tiers | Mobile + Backend |
| 6 | Urgency signal | Mobile |
| 7 | Organiser follow on event page | Mobile |
| 8 | Highlights card + Refund policy | Mobile + Backend |
| 9 | Related events | Mobile |
| 10 | Backend email + PDF ticket | Backend only |
