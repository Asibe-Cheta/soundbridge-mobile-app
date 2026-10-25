# Web Team: Heads-up on the Vote for SoundBridge campaign (not blocking)

**Date:** 2026-10-19
**From:** Mobile team
**Priority:** LOW — informational, does not block the campaign launching

---

## What this is

We're launching an in-app "Vote for SoundBridge" campaign (Investec Early-Stage Entrepreneur of the Year Awards, public vote open until ~5 Nov 2026). It has an in-app screen, up to 3 push notifications, and a home banner. All vote buttons (in the app and in any copy/link we share) point directly at `https://www.theeasies.com/vote`, the actual voting page, not at our own site — so this doesn't depend on anything on soundbridge.live working differently than it does today.

## The one thing worth knowing

`WEB_TEAM_UNIVERSAL_LINKS_SETUP_REQUIRED.md` (2026-04-09, still apparently open) documents the `TEAMID` placeholder bug in `apple-app-site-association`. While that's open, any `soundbridge.live/...` link tapped from outside the app on iOS (WhatsApp, Instagram, SMS) opens in the browser instead of the app. This isn't new or caused by this campaign, but it does mean:

- If anyone shares a `soundbridge.live` link (as opposed to the theeasies.com vote link) to promote this campaign, it won't open the SoundBridge app natively on iPhone until that fix ships. Android is unaffected either way.
- We're not blocking the campaign on this — we're just sending people straight to theeasies.com, which opens fine in any browser regardless.

## One small ask, whenever you get to the fix above (not urgent)

The mobile app already resolves `soundbridge.live/campaigns/<slug>` to an in-app screen (used for a few existing marketing pushes, now including this one). That path currently isn't in the proposed AASA `paths` list in the open ticket. If/when you deploy the TEAMID fix, adding `"/campaigns/*"` to that list would let any future campaign link (including this one, which resolves `campaigns/vote` internally even though the real push button always points at theeasies.com) open natively on iOS too. No rush — this is a nice-to-have, not something this campaign needs to launch.

---

Mobile side is otherwise self-contained for this campaign — nothing else needed from the web team to ship it.

---

## Update 2026-10-22: dashboard tracking for notification taps + link taps

**Priority:** MEDIUM — not blocking the campaign (it's already running), but needed to answer "how many people engaged and when."

The app already sends these events to `POST /api/analytics/events` (body: `{ events: [{ category, action, label, value, properties, timestamp }] }`), all with `category: "User Action"` and a client-generated ISO `timestamp`:

| `action`                  | fires when                                              | `properties`                                  |
|---------------------------|-----------------------------------------------------------|------------------------------------------------|
| `vote_notification_tapped`| user taps the push notification (new, just added)       | `{ pushNumber: 1 \| 2 \| 3 \| undefined, source: "push_notification" }` |
| `vote_now_tapped`         | user taps "Vote now" in the app (this is the actual link-out to theeasies.com) | `{ source: "vote_screen" }`                |
| `vote_link_copied`        | user taps "Copy link"                                    | `{ source: "vote_screen" }`                     |
| `vote_link_shared`        | user taps "Share"                                        | `{ source: "vote_screen" }`                     |

**The ask:** surface counts of each `action` above (grouped by `pushNumber` where present) plus a simple timestamp view, on whatever admin dashboard already shows analytics — so we can see tap volume per push and roughly when people engaged.

**One caveat to know about:** `flushEvents()` silently drops the whole queue if the user isn't authenticated at flush time (no local persistence/retry) — so logged-out taps on the notification or the deep link won't reach you. If that gap matters for accurate counts, let us know and we can look at queuing them until sign-in instead, but didn't want to change that behavior unasked.
