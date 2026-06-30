# Mobile → Web: AI Career Proactive Feature — 2026-06-22

**From:** Mobile / Justice  
**Re:** New proactive monitoring system for AI Career Adviser — web needs to run the daily filter function

---

## Overview

We've built a cheap daily filter that checks 4 signals for every premium/unlimited creator. When a signal fires, it calls Gemini Flash to generate a short, specific insight. The resulting records appear as an Alerts section on the AI Career Adviser screen in the mobile app.

---

## DB (applied to production)

Three new tables/columns:

```sql
-- 1. Opportunity scouting opt-in on venue_notification_preferences
alter table venue_notification_preferences
  add column opportunity_scouting_enabled  boolean   default false,
  add column last_opportunity_search_at    timestamptz;

-- 2. Admin-curated opportunities (mobile team adds via admin dashboard)
create table curated_opportunities (
  id               uuid primary key,
  title            text,
  description      text,
  opportunity_type text,  -- 'open_mic' | 'venue' | 'policy_change' | 'brand_partnership' | 'industry_news'
  genre_tags       text[],
  location_city    text,
  source_url       text,
  expires_at       date,
  created_by       uuid,
  created_at       timestamptz
);

-- 3. Proactive signal records
create table ai_proactive_signals (
  id                uuid primary key,
  creator_id        uuid,
  signal_type       text,  -- 'quality_threshold' | 'live_interest' | 'curated_opportunity' | 'service_match'
  signal_data       jsonb,
  generated_insight text,
  shown_to_user     boolean default false,
  notified_at       timestamptz,
  created_at        timestamptz
);

-- Plus curated_opportunity_surfaces join table (tracks what's been shown to whom)
```

---

## Daily Filter Function

The function is at:
```
supabase/functions/ai-career-proactive-filter/index.ts
```

**What it does:**
1. Fetches all premium/unlimited creators, including `onboarding_user_type`
2. For each: runs 4 cheap DB-only signal checks in parallel
3. When a signal fires: calls Gemini Flash (`gemini-2.5-flash`) to generate a short insight — **tailored to the creator's actual role** (podcaster, audio engineer, vocalist, musician, producer, etc.). A podcaster will never receive a musician-specific insight.
4. Inserts records into `ai_proactive_signals`
5. Sends one Expo push notification per creator per day (highest priority signal only)

**Important — search queries must match creator type:**
The opportunity scouting weekly search (your side) should tailor search terms to `onboarding_user_type`. For example:
- `musician / vocalist / singer` → venue availability, live slots, session gig boards, open mics, festival submissions
- `podcaster` → podcast sponsorships, recording studio slots, podcast conventions, brand partnership calls
- `audio_engineer` → studio hire availability, mixing/mastering gig boards, audio industry news
- `producer / beatmaker` → sync licensing calls, beat placement opportunities, studio collab listings
- All types → policy changes (streaming royalties, copyright law), brand partnerships, industry news

The `opportunity_type` column handles this — tag results correctly so the mobile insights are relevant.

**Needs these env vars set:**
- `SUPABASE_URL` (already set)
- `SUPABASE_SERVICE_ROLE_KEY` (already set)
- `GEMINI_API_KEY` — add the same key used in mobile (`EXPO_PUBLIC_GEMINI_API_KEY`)

**How to deploy:**
```bash
supabase functions deploy ai-career-proactive-filter
```

**How to schedule (run once daily at 09:00 UTC):**

Option A — Supabase Dashboard → Edge Functions → Schedule:
```
0 9 * * *
```

Option B — pg_cron (if you already use it):
```sql
select cron.schedule(
  'ai-career-proactive-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/ai-career-proactive-filter',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  );
  $$
);
```

---

## Opportunity Scouting (opt-in weekly search)

For creators who have `opportunity_scouting_enabled = true` in `venue_notification_preferences`:

- Run at most once per week (check `last_opportunity_search_at`)
- Search specifically for open mic nights and venue opportunities in their city and genre
- Add genuine results to `curated_opportunities` (mobile admin team also adds these manually)
- Update `last_opportunity_search_at` on the creator's venue prefs row after searching

**Rate limiting check:**
```sql
where opportunity_scouting_enabled = true
  and (last_opportunity_search_at is null 
       or last_opportunity_search_at < now() - interval '7 days')
```

This weekly search is lower priority — mobile team can implement this separately if you want, or fold it into the daily job with a pre-filter.

---

## Summary

| Task | Who | Status |
|------|-----|--------|
| DB migration (3 tables) | Mobile | ✅ Applied |
| Daily filter function (Deno) | Mobile | ✅ Written |
| Deploy + schedule daily cron | **Web** | ❌ Needed |
| Add `GEMINI_API_KEY` env var to function | **Web** | ❌ Needed |
| Mobile Alerts section on AI Career Adviser | Mobile | ✅ Done |
| Admin — Curated Opportunities form (mobile) | Mobile | ✅ Done |
| Opportunity scouting weekly search (optional) | TBD | — |

Questions? Ping on Slack.
