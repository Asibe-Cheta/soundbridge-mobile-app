# Earn Money Live — Web Team Brief

**Feature shipped on mobile:** 2026-07-14
**Prepared for:** Web team (backend DB + web app)
**Contact:** Justice (mobile)

---

## What this feature is

A periodic in-app nudge that surfaces to creators on a weekly cadence, encouraging them to actively use the Tip Room QR code feature for live, in-person earnings at gigs, events, and meetups. The nudge navigates directly to the creator's Tip Room.

**Mobile implementation summary:**
- A slide-down banner component (`EarnMoneyLiveNudge`) appears in the Feed 3 seconds after launch
- Shown at most once every 7 days (tracked in `AsyncStorage` with key `sb_earn_live_nudge_v1`)
- Only shown to users with `role === 'creator'` on their profile
- Primary CTA → navigates to the Tip Room tab in the Live Sessions screen
- Secondary CTA "Not sure where to start?" → navigates to the AI Career Advisor, pre-seeding the chat input with a live-earning prompt
- Auto-dismisses after 12 seconds

**This feature is entirely frontend — no new database tables or backend endpoints are required.**

---

## 1. What the web app needs to implement

### 1.1 Tip Room page parity

The mobile Tip Room tab (`soundbridge.live/tip/:username`) already exists as the web QR code destination. No changes required there.

If the web app has a creator dashboard or a "Tools" / "Earnings" section, consider adding a **Tip Room card or entry point** there so creators can access it outside of the mobile context.

### 1.2 Nudge (equivalent to mobile banner)

The web app equivalent is a **notification banner or dashboard prompt** surfaced to creators when they log in or visit their dashboard. Suggested approach:

- Show a dismissible banner or card once per week
- Copy variants (rotate based on calendar day):

| Day of month | Copy |
|---|---|
| 1st | "Happy new month! Earn money live this month" |
| 2nd–7th | "Earn money live this month" |
| 8th onwards | "Earn money live this week" |

- Primary CTA: links to `soundbridge.live/tip/:username` (the creator's own Tip Room page), or opens the Tip Room section in the dashboard
- Secondary CTA "Not sure where to start?": links to the AI Career Advisor on the web (if available), or links to the usage guidance section (see §1.3)

**Cadence tracking:** Use a cookie, `localStorage`, or `user_metadata` field to record last-shown timestamp. Only show again if more than 7 days have passed since last shown.

> **Using user_metadata (recommended for cross-device parity):**
> The mobile app uses Supabase `auth.users.user_metadata` for some preference flags. If you want the nudge suppression to sync across mobile and web, add a key to `user_metadata`:
> ```json
> { "earn_live_nudge_last_shown": "2026-07-14T12:00:00Z" }
> ```
> Mobile can be updated to respect this if cross-device sync is needed. For v1, device-local storage (AsyncStorage / localStorage) is fine.

---

## 2. Usage guidance — content to add to the Tip Room page

The mobile Tip Room now shows a "Using your QR code at live events" info card. Mirror this on the web Tip Room page (the `soundbridge.live/tip/:username` creator view or dashboard panel), either inline or as an expandable help section:

> **Using your QR code at live events**
>
> - **Laptop:** Open your Tip Room link (`soundbridge.live/tip/you`) in a browser and place your laptop where fans can see it — no extra setup needed.
> - **Projector:** Connect to a projector and display the QR code full-screen. Any smartphone camera can scan it from across a room.
> - **Print:** Print the QR code as a card or poster for your merch table. It never expires or changes.

**Important:** The QR code is a static URL (`soundbridge.live/tip/:username`). It does not contain session tokens or time-limited parameters. Creators can safely print it indefinitely.

---

## 3. "Download printable QR code" (optional for v1)

If the web Tip Room page doesn't already have a download option, add one. The mobile app renders the QR code via `react-native-qrcode-svg` — the web equivalent is any standard QR library (e.g. `qrcode.js`, `qrcode-svg`).

Suggested export: a 1200×1200 px PNG or SVG of the QR code with the creator's username and the SoundBridge wordmark below it, suitable for printing at A5 size or larger.

This is a nice-to-have for v1 — the core nudge + guidance is the priority.

---

## 4. AI Career Advisor integration (if the web has it)

On mobile, the "Not sure where to start?" secondary CTA navigates to the AI Career Advisor with a pre-seeded chat prompt:

> "I want to start earning money from live performances. Can you help me understand the best ways to use my Tip Room QR code at gigs and events?"

If the web AI Career Advisor exists:
- Route the user there with this prompt pre-filled in the chat input
- This should count against their existing AI Advisor usage limits (same tier system as mobile)
- Do not treat it as a free/unlimited interaction

If the web AI Career Advisor does not exist, link the secondary CTA to the usage guidance section (§2) or a help article instead.

---

## 5. What does NOT need to change

- **Tip Room backend:** The `tip_room_tips` table, tip processing, and `soundbridge.live/tip/:username` page are unchanged.
- **Creator role gating:** Already enforced on the backend. The nudge only appears for `profiles.role = 'creator'`.
- **QR code:** The URL schema and QR content are unchanged — `https://soundbridge.live/tip/:username`.
- **Stripe / Fincra payment flows:** Unaffected.

---

## 6. Summary checklist for web team

- [ ] Add a weekly Tip Room nudge banner to the creator dashboard (copy variants + 7-day cadence)
- [ ] Primary CTA links to `soundbridge.live/tip/:username` or the in-dashboard Tip Room panel
- [ ] Secondary CTA links to AI Career Advisor (pre-seeded prompt) or usage guidance
- [ ] Add "Using your QR code at live events" guidance to the Tip Room page or dashboard (laptop / projector / print)
- [ ] Optional: add "Download printable QR code" button to the Tip Room page
- [ ] Optional: sync nudge suppression across devices via `user_metadata.earn_live_nudge_last_shown`
