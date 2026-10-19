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
