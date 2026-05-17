# Web Team: Fix apple-app-site-association — TEAMID Placeholder Never Filled In

**Date:** 2026-04-09
**From:** Mobile team
**Priority:** HIGH — iOS share links open in browser instead of the app

---

## What's wrong

Both `.well-known` files are deployed. Android (`assetlinks.json`) is complete and correct.

iOS (`apple-app-site-association`) was deployed with `TEAMID` as a **literal string placeholder** — the real Apple Team ID was never substituted. iOS validates this file on install and rejects it when the appID is invalid, so Universal Links silently fall back to the browser.

Current file at `https://soundbridge.live/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.soundbridge.mobile",   ← THIS IS THE BUG
        ...
      }
    ]
  }
}
```

---

## Fix — two things needed

### 1. Replace TEAMID with the real Apple Team ID

Get it from: **developer.apple.com → Account → Membership details → Team ID**

It's a 10-character alphanumeric string (e.g. `AB12CD34EF`).

### 2. Add missing paths (several routes the app handles are not listed)

Replace the entire file with this (substitute `YOUR_TEAM_ID`):

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "YOUR_TEAM_ID.com.soundbridge.mobile",
        "paths": [
          "/auth/mobile-callback*",
          "/auth/callback*",
          "/confirm*",
          "/verify*",
          "/track/*",
          "/album/*",
          "/playlist/*",
          "/profile/*",
          "/@*",
          "/creator/*",
          "/event/*",
          "/post/*",
          "/live/*",
          "/messages/*",
          "/wallet/*",
          "/opportunity/*",
          "/collaboration/*"
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": [
      "YOUR_TEAM_ID.com.soundbridge.mobile"
    ]
  }
}
```

---

## Do NOT change assetlinks.json

`https://soundbridge.live/.well-known/assetlinks.json` is complete and correct — leave it alone.

---

## Verify after deploying

```bash
# Should show your real Team ID, not "TEAMID"
curl https://soundbridge.live/.well-known/apple-app-site-association | grep appID
```

Apple's validator (shows what iOS sees):
```
https://app-site-association.cdn-apple.com/a/v1/soundbridge.live
```

**Testing note:** iOS caches the AAPF on install. After the fix is deployed, testers need to **delete and reinstall the app** to pick up the new file. Existing installs won't update automatically until the next app install/update.

---

## What this fixes

Once deployed, tapping `https://soundbridge.live/track/<id>` on an iPhone with SoundBridge installed will open the app directly to the track — no browser, no landing page. Same for profiles, events, albums, playlists, posts, live sessions. No app installed = falls back to the web page as before.

The mobile app is fully ready — all URL routing is already implemented in `DeepLinkingService.ts`.
