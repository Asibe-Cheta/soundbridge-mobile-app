# Mobile → Web: Tip Room Feature — 2026-06-22

**From:** Mobile / Justice  
**Re:** New Tip Room feature — web needs to build the `/tip/{username}` scan page

---

## Overview

We've added a "Tip Room" tab to the Live Sessions screen on mobile. Creators get a persistent QR code pointing to:

```
https://soundbridge.live/tip/{username}
```

This URL must resolve to a **minimal, single-purpose tipping page** — no profile content, no scrolling, just pay.

---

## DB

Migration already applied to production:

```sql
create table public.tip_room_tips (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  amount      decimal(10,2) not null,
  currency    text not null default 'gbp',
  tipped_at   timestamptz not null default now()
);
```

RLS: creators can SELECT their own rows (for the mobile stats counter). Web backend inserts via service role after Stripe payment succeeds.

---

## The `/tip/{username}` Page

### What to show

- Creator **name** and **profile photo** — small, at the top. Nothing else from the profile.
- Headline: **"Support [Creator Name]"**
- **Amount input**, defaulting to £1, editable
- Quick preset buttons: **£1 / £5 / £10**
- A single **"Pay"** button

No bio, no music player, no social links, no scrolling content. The scan-to-pay path must be as short as possible.

### On payment

- Process through the existing Stripe tipping flow (same as the existing `/tip` or in-app TipModal).
- On success, show: **"Thank you for supporting [Creator Name]."**
- Then offer the post-tip community join prompt (same copy/flow used elsewhere — only after payment, never before).

### After payment — insert a row

```js
// Web backend inserts after Stripe confirms
await supabase.from('tip_room_tips').insert({
  creator_id: creatorProfile.id,
  amount: tipAmount,
  currency: 'gbp',
  tipped_at: new Date().toISOString(),
});
```

This powers the "today / this week / this month" stats counters shown to creators on mobile. No auth required from the tipper — insert via service role.

---

## Creator lookup

Resolve `username` → creator profile:

```sql
select id, display_name, avatar_url
from profiles
where username = $1
  and role = 'creator'
limit 1;
```

If not found → 404 page ("Creator not found").

---

## QR code generation

No DB record needed for the QR code itself — the URL is deterministic (`/tip/{username}`). Mobile generates the QR code client-side using `react-native-qrcode-svg`. The QR never expires; if the creator changes their username, they'd generate a new QR naturally (username changes are rare/locked).

---

## Summary

| # | Task | Who |
|---|------|-----|
| 1 | Build `/tip/{username}` minimal payment page | Web |
| 2 | Insert row into `tip_room_tips` after Stripe success | Web |
| 3 | Post-tip community join prompt on success | Web |
| 4 | Mobile stats counter already implemented — reads from `tip_room_tips` | ✅ Done |
| 5 | Mobile QR code generation already implemented | ✅ Done |

Questions? Ping on Slack.
