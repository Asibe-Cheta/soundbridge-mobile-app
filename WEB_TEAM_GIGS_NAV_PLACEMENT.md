# SoundBridge Web — Gigs & Opportunities Navigation Placement

**Date:** 2026-02-24
**For:** Web team
**Context:** Based on the current authenticated home page UI (Feed view with top navbar, left sidebar, right sidebar layout)

This document specifies exactly where every gig/opportunity route should be surfaced in the existing web UI. No new layout patterns are needed — all placements slot into existing components.

---

## Current UI reference (authenticated home page)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Logo] Feed | Network | Discover | Events | Creators | Live  [🔍 Search] [Upload↑] [👤] │
├──────────────┬───────────────────────────────┬───────────────────────────┤
│ LEFT SIDEBAR │         FEED (centre)         │       RIGHT SIDEBAR       │
│              │                               │                           │
│ [Avatar]     │  [Share an update...]         │  QUICK ACTIONS            │
│ Asibe Cheta  │                               │  (•)) Start Live Session  │
│ Vocal Coach  │  [Live Audio Sessions card]   │  +   Create Event         │
│              │                               │                           │
│ Connections 2│  [Feed posts...]              │  OPPORTUNITIES            │
│              │                               │  No opportunities yet     │
│ QUICK LINKS  │                               │  See all →                │
│ My Activity  │                               │                           │
│ Saved Items  │                               │  PEOPLE YOU MAY KNOW      │
│ Live Sessions│                               │  See all →                │
│ Events       │                               │                           │
│ Opportunities│                               │  MESSAGING                │
└──────────────┴───────────────────────────────┴───────────────────────────┘
```

---

## Change 1 — Top navbar: add "Gigs" tab

**Where:** Between **Events** and **Creators** in the top nav.

**Before:**
```
Feed | Network | Discover | Events | Creators | Live
```

**After:**
```
Feed | Network | Discover | Events | Gigs | Creators | Live
                                      ↑
                              route: /gigs/my
                              label: "Gigs"
                              icon: briefcase or lightning bolt (same style as other nav icons)
```

**Behaviour:**
- Active state: highlighted same as "Feed" (pink/red underline or fill)
- Links to `/gigs/my` — the My Opportunities page with tabs (All / Active / Urgent / Completed)
- Visible to all authenticated users (both requesters and providers)

---

## Change 2 — Right sidebar: expand Quick Actions panel

**Where:** The existing **QUICK ACTIONS** panel on the right sidebar.

**Before:**
```
QUICK ACTIONS
  (•)) Start Live Session
  +    Create Event
```

**After:**
```
QUICK ACTIONS
  (•)) Start Live Session        → existing
  +    Create Event              → existing
  ─────────────────────────────
  🔥  Post Urgent Gig           → /gigs/urgent/create
  📋  Post Opportunity          → /gigs/new
```

**Notes:**
- Add a thin divider between existing actions and new gig actions
- "Post Urgent Gig" uses the 🔥 icon or a red lightning bolt to match the urgent branding
- "Post Opportunity" uses a clipboard / checklist icon
- Same row style as the existing actions (icon + label, full-width tappable row)

---

## Change 3 — Right sidebar: enhance Opportunities panel

**Where:** The existing **OPPORTUNITIES** panel on the right sidebar (currently shows "No opportunities yet").

### Empty state (no active gigs):

```
OPPORTUNITIES                                     See all →
                                                  ↑ /gigs/my

  No opportunities yet

  [+ Post Opportunity]    [🔥 Post Urgent Gig]
       ↓                          ↓
    /gigs/new            /gigs/urgent/create
```

### Active state (user has posted gigs):

```
OPPORTUNITIES                                     See all →

  ┌────────────────────────────────────────┐
  │ 🔥 Trumpeter Needed Tonight            │
  │    Searching · 3 responses             │  → /gigs/{gigId}/responses
  └────────────────────────────────────────┘

  ┌────────────────────────────────────────┐
  │ 📋 Session Vocalist for Album          │
  │    2 expressions of interest           │  → /opportunities/{id}
  └────────────────────────────────────────┘
```

**"See all →"** links to `/gigs/my`.

---

## Change 4 — Left sidebar: update Quick Links

**Where:** The **QUICK LINKS** section in the left sidebar.

**Before:**
```
QUICK LINKS
  My Activity
  Saved Items
  Live Sessions
  Events
  Opportunities
```

**After:**
```
QUICK LINKS
  My Activity
  Saved Items
  Live Sessions
  Events
  My Gigs          → /gigs/my     (rename "Opportunities" to "My Gigs")
  Wallet           → /wallet      (NEW)
```

**Notes:**
- Rename existing "Opportunities" link to **"My Gigs"** — covers both urgent and planned
- Add **"Wallet"** below it with a wallet/coin icon
- Same style as the existing Quick Links items

---

## Change 5 — Upload button: expand to dropdown

**Where:** The red **"↑ Upload"** button in the top navbar (top right area).

**Before:** Single button → uploads a track.

**After:** Split button or dropdown chevron:

```
[ ↑ Upload  ▾ ]
    │
    ├─ Upload Track / Audio      → existing upload flow
    ├─ ─────────────────────────
    ├─ 📋 Post Opportunity       → /gigs/new
    └─ 🔥 Post Urgent Gig       → /gigs/urgent/create
```

**Alternative (if splitting the Upload button is too disruptive):**
Keep Upload as-is and rely on Quick Actions + navbar "Gigs" tab as the gig entry points. Only expand Upload if your design system easily supports a split button.

---

## Change 6 — Avatar profile dropdown

**Where:** The **👤 avatar icon** in the top right corner — add items to whatever dropdown it currently opens.

**Add:**
```
  Profile
  Settings
  ─────────────────
  💰 Wallet              → /wallet         (NEW)
  📍 Availability        → /settings/availability   (NEW)
  ─────────────────
  Sign out
```

**Notes:**
- "Wallet" shows the user's balance inline if feasible: `💰 Wallet  £105.60`
- "Availability" is specifically for providers opting into urgent gig matching — label could be "Gig Availability" for clarity

---

## Change 7 — Feed composer: add "Urgent Gig" post type

**Where:** The **"Share an update, opportunity, or achievement..."** composer at the top of the feed.

The composer likely already supports post types (post, audio, opportunity, event). Add:

```
[Share an update, opportunity, or achievement...]

Post types:
  ✏️ Post  |  🎵 Track  |  📋 Opportunity  |  📅 Event  |  🔥 Urgent Gig
                                                                ↓
                                                     /gigs/urgent/create
                                             (clicking this type navigates
                                              directly to the create form,
                                              same as "Post Event" does)
```

---

## Change 8 — Opportunities browse page (`/opportunities`)

**Where:** The existing `/opportunities` listing page.

Add a **tab or toggle** at the top to switch between planned and urgent:

```
[ 📋 Planned Opportunities ]   [ 🔥 Urgent Gigs ]
```

- Planned tab: existing behaviour, shows `gig_type = 'planned'` posts
- Urgent tab: shows `gig_type = 'urgent'` cards with 🔥 URGENT badge and expiry countdown
- Each urgent card on this tab links to `/gigs/{gigId}/detail` (not `/opportunities/{id}`)

---

## Page-level in-context links (no nav required)

These links don't need a nav entry — they appear contextually on the relevant page only.

| Page | When to show | Link label | Route |
|------|-------------|------------|-------|
| `/projects/{id}` | `status === 'delivered'` | "Raise a Dispute" | `/dispute/{projectId}` |
| `/projects/{id}` | `status === 'completed'`, user is provider | "View payment in Wallet →" | `/wallet` |
| `/projects/{id}` | `status === 'completed'`, user not yet rated | "Leave a review" | `/rate/{projectId}?rateeId=...` |
| `/gigs/{id}/responses` | After selecting provider | "View Gig Project →" | `/projects/{projectId}` |
| Notification bell | `rating_prompt` type | "Leave a review" | `/rate/{projectId}?rateeId=...` |
| Notification bell | `confirm_completion` type | "Confirm now" | `/projects/{projectId}` |
| Notification bell | `opportunity_project_disputed` type | "View dispute" | `/dispute/view/{disputeId}` |
| Notification bell | `urgent_gig` type | "View gig" | `/gigs/{gigId}/detail` |
| Notification bell | `gig_accepted` type | "View responses" | `/gigs/{gigId}/responses` |

---

## Provider availability promo banner (feed)

Show this **once per week** (dismiss to localStorage) to authenticated users who have not yet enabled `available_for_urgent_gigs`:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔥  Get paid for last-minute gigs                                   │
│     Turn on availability to receive urgent gig requests near you.   │
│                                              [Set Availability →]   │
└─────────────────────────────────────────────────────────────────────┘
```

- Position: top of feed, below the composer, above the first post
- Style: subtle banner with amber/orange left border (not a modal/blocker)
- "Set Availability →" → `/settings/availability`
- Show only to users who are musicians/creators (role check), not to non-creator accounts

---

## Full placement summary

| Route | Primary entry | Secondary entry |
|-------|--------------|-----------------|
| `/gigs/my` | **Navbar "Gigs" tab** | Left sidebar "My Gigs" |
| `/gigs/urgent/create` | **Quick Actions "Post Urgent Gig"** | Upload dropdown, feed composer "Urgent Gig" type |
| `/gigs/new` | **Quick Actions "Post Opportunity"** | Upload dropdown |
| `/wallet` | **Left sidebar "Wallet"** | Avatar dropdown |
| `/settings/availability` | **Avatar dropdown "Availability"** | Availability promo banner (feed) |
| `/gigs/{id}/detail` | Notification bell | Urgent tab on `/opportunities` |
| `/gigs/{id}/responses` | Right sidebar Opportunities panel | Notification bell |
| `/projects/{id}` | Right sidebar Opportunities panel | Notification bell |
| `/dispute/{projectId}` | Project page only | Notification bell |
| `/rate/{projectId}` | Project page only | Notification bell |
| `/opportunities` | Existing (no change to entry point) | Navbar "Discover" or existing |
