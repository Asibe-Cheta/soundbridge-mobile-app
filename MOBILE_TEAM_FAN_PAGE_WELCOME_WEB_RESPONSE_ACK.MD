# Mobile Team — Fan Page Welcome (Web Response Acknowledged)

**Date:** 2026-06-08  
**Web commit ref:** `c248e6df`  
**Related:** `MOBILE_TEAM_FAN_PAGE_WELCOME_WEB_QUESTIONS.MD`, `MOBILE_TEAM_COMMUNITY_ENTRY_RESPONSE.MD`

---

## Summary

Web confirmed our root-cause analysis: the primary Join CTA is **`soundbridge://artist/[username]`**, which mobile did not parse correctly before the 2026-06-08 OTA. Additional alignment applied below.

---

## Web answers → mobile status

| Web canonical | Mobile status |
|---------------|---------------|
| Primary Join CTA: `soundbridge://artist/[username]` | ✅ Parsed (host + `/artist/` path segments) |
| Fan page universal link: `https://soundbridge.live/[username]/home` | ✅ Persists attribution on open |
| Web signup fallback: `/signup?community_creator=[username]` | ✅ Added `parseSignupUrl` |
| Partner join: `/join?ref=` | ✅ `ref` in metadata + `record_referral_signup` RPC on onboarding |
| `complete-onboarding` body: `communityCreatorUsername`, `communityCreatorId` | ✅ camelCase sent |
| `complete-profile` body: `community_creator_username`, `community_creator_id` | ✅ snake_case sent |
| Referral via `user_metadata.referred_by_code` at signup | ✅ AuthScreen signup metadata |
| **Not** `referralCode` in `complete-onboarding` body | ✅ Removed from body |
| Welcome gate: `welcomeUsername` + `community-welcome-status` | ✅ `resolveWelcomeAfterOnboarding` + App pending flag |
| Safari view → native signup without deep link | ❌ Expected gap — no server bridge (web confirmed) |

---

## Test checklist (post-OTA)

1. Tap **Join [Creator]'s community** on fan page → app opens via `soundbridge://artist/[username]`
2. Complete signup + onboarding on device
3. Expect **Community Welcome** screen (not feed)
4. SQL: `community_entry_creator_id` set, `community_entry_shown_at` null until dismiss

**Failing test email:** run SQL from web response §F and share with web team.

---

## Optional web follow-up (their offer)

Universal link on primary CTA (`https://soundbridge.live/[username]/home?join=1`) in addition to custom scheme — would improve Safari → app handoff when scheme fails. Mobile can add `?join=1` handler if web ships it.
