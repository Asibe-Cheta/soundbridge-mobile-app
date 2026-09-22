# RESOLVED — purchased_event_tickets.status vocabulary + a real bug found

**Answer from web team**: `status IN ('active', 'used', 'refunded', 'cancelled')`, default
`'active'` — confirmed against the real CHECK constraint and every write path
(`confirm-ticket-purchase`, `validate-ticket`, `events/[id]/cancel`, `stripe/webhook`).
**`'confirmed'` is not and has never been a valid value.**

**This surfaced a real, active bug**: `CreatorRevenueService.ts` was checking
`.eq('status', 'confirmed')` in 5 places — since that value never exists, those queries have been
silently returning **zero event-ticket revenue to every creator, permanently**, since the file was
written. Fixed in this session: all 5 changed to `.in('status', ['active', 'used'])`, matching
`EventTicketService.ts`'s (correct) existing pattern. `event_checkins`'s RLS
(`20260922030000_event_checkins.sql`) also tightened to the same two values.

Original question preserved below for context.

---

## Context

Building Item 42 ("Who's Coming" arrival check-in). The new `event_checkins` RLS policy
(`supabase/migrations/20260922030000_event_checkins.sql`) needs to verify an attendee actually
holds a valid ticket before letting them check in — by checking `purchased_event_tickets.status`.

## The problem

`purchased_event_tickets` has no tracked schema in the mobile repo (owned by a separate backend),
and the mobile codebase itself is inconsistent about what "valid ticket" means on that column:

- `src/services/EventTicketService.ts` (used to gate the "Ticket Purchased" UI on
  `EventDetailsScreen.tsx`): `.in('status', ['active', 'used'])`
- `src/services/CreatorRevenueService.ts` (used for creator revenue/demographics reporting):
  `.eq('status', 'confirmed')`

Same column, two different value sets, both presumably intentional at the time they were written,
neither one verified against the real backend. I don't have DB introspection access from here to
settle it myself.

## What I did in the meantime

The new RLS policy accepts the union of all three (`'confirmed', 'active', 'used'`) rather than
guessing wrong and silently blocking every real ticket holder — a permissive default was safer
than a narrow, possibly-wrong one for a low-stakes, opt-in feature like this.

## What I need

The real status vocabulary for `purchased_event_tickets.status` (all possible values, and which
ones represent "this person has a valid, usable ticket right now"). If `EventTicketService.ts` or
`CreatorRevenueService.ts` turns out to be checking the wrong values, that's worth fixing
independently of this — either one being wrong is a latent bug (EventTicketService gates whether a
user sees "Ticket Purchased" at all; CreatorRevenueService feeds real revenue numbers to
creators).
