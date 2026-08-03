# Listener Onboarding Framing — Web Team Brief

**Feature shipped on mobile:** 2026-07-20
**Prepared for:** Web team (web app onboarding flow)
**Contact:** Justice (mobile)

---

## What this feature is

A new explanatory step added to the Music Lover (listener/fan) onboarding flow. It clarifies why SoundBridge exists for fans — before asking for location-based permissions — so users understand the value exchange before being prompted.

**Mobile implementation summary:**
- New screen `musicLover_purpose` inserted into the Music Lover onboarding path, between the "discover creators" value demo step and the notification permission step
- Step 6 of 7 in the music lover path
- Full-screen with dark overlay background, matching the surrounding onboarding screens
- Pink→purple gradient heart icon at the top
- Headline, body copy, and a secondary forward-looking note
- Single "Let's go" CTA — no skip, as this is informational only
- No backend logic, no new database fields — purely a copy and flow change

---

## What to build

Add a **dedicated informational step** to the existing web onboarding flow for listeners/fans, positioned immediately before the location permission request (or the step where you ask for any device permission — notification, location, etc.). If web onboarding is a single-page or modal flow rather than multi-step, add this as an inline section above the permission request UI.

### Placement in the web listener onboarding flow

Insert this step **after** the genre/event preferences step and **before** any permission request (location, notifications, etc.).

If the web onboarding has no permission step, insert it as the **final step before the user lands on their home feed**.

---

## Copy (use exactly as written, adapting formatting to web UI patterns)

**Headline:**
> Discover artists. Support them directly.

**Body:**
> SoundBridge shows you musicians, podcasters, and DJs near you and matched to what you love. When you find someone you want to support, you can tip them directly, keep them going, and help them grow — no middleman, no waiting.

**Secondary note** (smaller text below the body, lighter colour):
> The more you support artists you love, the more you'll unlock as we grow.

**CTA button:**
> Let's go

No skip link is needed — this is a single-screen explanation with no action to opt out of.

---

## Visual design guidance

Match the existing web onboarding step styling (don't introduce a new design pattern). On mobile this screen uses:

- Dark semi-transparent overlay on a background image
- White headline at `26px / 800 weight`
- Body copy at `15px / 65% white opacity`
- Secondary note at `13px / 38% white opacity`
- A `80×80px` circular pink→purple gradient icon with a heart symbol centred inside
- Full-width pill-shaped gradient button (`#EC4899` → `#9333EA`) for the CTA

On web, translate this to your existing onboarding card/step component. Use the same gradient palette (`#EC4899` → `#9333EA`) for the icon and button if your design system allows it — these already appear in the mobile notification permission step and tier selection step, so this is consistent with the established SoundBridge onboarding palette.

---

## What does NOT need to change

- **No new backend tables or API endpoints** — this is purely a frontend/copy change.
- **No rewards logic** — the secondary note ("the more you support…") is intentionally vague and forward-looking. Do not wire up any points, unlocks, or gamification tracking.
- **No changes to the location or notification permission request itself** — only add context before it, do not modify the permission prompt UI or logic.
- **No changes to the fan/listener data model** — `profiles.role = 'listener'` is unchanged.

---

## Summary checklist for web team

- [ ] Add a new informational step to the web listener onboarding flow, after genre/event preferences and before any permission request
- [ ] Headline: "Discover artists. Support them directly."
- [ ] Body: the full paragraph above (no middleman, no waiting)
- [ ] Secondary note: "The more you support artists you love, the more you'll unlock as we grow." — lighter text, smaller size
- [ ] CTA: "Let's go" — advances to the next step (permission request or home feed)
- [ ] No skip link needed
- [ ] Match existing web onboarding step component styling
- [ ] No backend changes, no rewards logic, no permission UI changes
