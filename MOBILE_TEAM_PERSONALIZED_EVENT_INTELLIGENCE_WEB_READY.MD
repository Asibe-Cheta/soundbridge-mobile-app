# Web Team → Mobile Team: Personalised Event Intelligence — Backend Ready

**Date:** 2026-06-10  
**Spec:** `PERSONALIZED_EVENT_INTELLIGENCE.MD`  
**Your handoff:** `MOBILE_TEAM_PERSONALIZED_EVENT_INTELLIGENCE_WEB_HANDOFF.MD`

---

## TL;DR

Web owns `event_match_scores` population, daily scoring at **3AM UTC** (~3AM UK in winter), and Gemini reasons for scores ≥ 75. **No new API routes** — mobile reads/writes via Supabase as documented.

---

## Database

Migration: `supabase/migrations/20260610120000_personalized_event_intelligence.sql`

Apply on prod before first cron run (Justice).

**RLS:**
- Users `SELECT` own rows
- Users `UPDATE` own rows (`indicator_shown`, `indicator_dismissed`)
- Inserts/upserts via service role (cron job only)

---

## Mobile queries (unchanged)

```sql
SELECT ems.*, e.*
FROM event_match_scores ems
JOIN events e ON e.id = ems.event_id
WHERE ems.user_id = $uid
  AND ems.match_score >= 75
  AND ems.indicator_dismissed = false
  AND ems.expires_at > now()
ORDER BY ems.match_score DESC;
```

Pulse indicator: unseen rows where `indicator_shown = false` and `match_score >= 75`.

---

## Daily cron

| Item | Value |
|------|--------|
| Path | `GET /api/cron/event-match-intelligence` |
| Schedule | `0 3 * * *` UTC (Vercel) |
| Auth | `Authorization: Bearer {CRON_SECRET}` |

**Per run:**
1. Delete expired rows (`expires_at < now()`)
2. Score eligible users (behaviour or preference signals) vs events **tomorrow → +90 days**
3. Upsert scores ≥ 50; delete recalc scores < 50
4. Gemini Flash reason **once** per user-event pair when score ≥ 75 and `personalised_reason IS NULL`
5. Preserve `indicator_shown`, `indicator_dismissed`, cached `personalised_reason` on recalc

---

## Scoring formula (implemented)

| Signal | Max pts |
|--------|---------|
| Genre in preferred_genres | 25 |
| Genre from tipped tracks | 15 |
| Mood overlap (creator track moods) | 15 / 8 partial |
| Location city / preferred cities / 50mi | 20 / 15 / 10 |
| Calendar free (if connected) | 20 |
| Else preferred time + active month | 10 + 10 |
| Tipped creator / live interest / follow | 15 / 15 / 8 |
| Planning window match | 5 |

Calendar: FreeBusy checked for top preliminary matches (max 25/user/run) when `calendar_integrations.calendar_connected`.

---

## Gemini

**Env (Vercel):** `GEMINI_API_KEY` or `GOOGLE_GEMINI_API_KEY`  
**Optional:** `GEMINI_EVENT_MATCH_MODEL` (default `gemini-2.0-flash`)

Without API key, scores still populate; `personalised_reason` stays null.

---

## Manual test (after migration + deploy)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://www.soundbridge.live/api/cron/event-match-intelligence
```

Check `event_match_scores` for test users with behaviour profiles + upcoming events.

---

## Mobile smoke test (after first cron)

- [ ] Pulse on Feed header when unseen ≥75 match exists
- [ ] "Events picked for you" sorted by `match_score` desc
- [ ] `personalised_reason` under cards when present
- [ ] `indicator_shown = true` after viewing screen hides pulse
- [ ] "For you" badge on feed cards for matched events

---

## Web files

| File | Role |
|------|------|
| `src/lib/event-match-scoring.ts` | Scoring formula |
| `src/lib/event-match-intelligence-job.ts` | Batch job |
| `src/lib/gemini-event-match-reason.ts` | Gemini one-liner |
| `app/api/cron/event-match-intelligence/route.ts` | Vercel cron entry |
