# Personalised Event Intelligence — Web Handoff

Mobile implements UI from `PERSONALIZED_EVENT_INTELLIGENCE.MD`. Web owns scoring job, Gemini reasons, and `event_match_scores` population.

## Mobile scope (shipped in app)

| Feature | Implementation |
|---------|----------------|
| Pulsating indicator | Feed tab header (`EventMatchPulseIndicator`) when unseen score ≥ 75 |
| Events picked for you | `EventsPickedForYouScreen` — sorted by `match_score` desc |
| Feed badges | `EventPostCard` — "For you" badge + `personalised_reason` |
| Indicator dismissal | Mobile sets `indicator_shown = true` when user opens picked-events screen |

Mobile **does not** run scoring or call Gemini.

---

## 1. Database

Apply `migrations/personalized_event_intelligence.sql`.

Mobile reads/writes:

```sql
SELECT ... FROM event_match_scores
WHERE user_id = $uid
  AND match_score >= 75
  AND indicator_dismissed = false
  AND expires_at > now()
ORDER BY match_score DESC;

UPDATE event_match_scores
SET indicator_shown = true
WHERE user_id = $uid AND id = ANY($ids);
```

RLS: users SELECT own rows; UPDATE only `indicator_shown` / `indicator_dismissed` (service role inserts scores).

---

## 2. Daily scoring job (web)

**Schedule:** 3AM UK time daily.

**Per user (batch 100):**

1. Load `user_behaviour_profiles`
2. Load `notification_preferences` (genres, `preferred_notification_times`, `event_planning_window`, `active_event_months`)
3. Load Google Calendar free/busy if `calendar_integrations` connected
4. Score events from tomorrow → +90 days using formula in `PERSONALIZED_EVENT_INTELLIGENCE.MD`
5. Upsert `event_match_scores` (`match_score`, `match_reasons`, `expires_at` = event start)
6. For **new** rows with `match_score >= 75` and `personalised_reason IS NULL`, call **Gemini Flash** once and cache result
7. Delete rows where `expires_at < now()`

**Thresholds:**

| Score | Treatment |
|-------|-----------|
| ≥ 75 | High confidence — mobile indicator + badge + reason |
| 50–74 | Stored only; not surfaced on mobile yet |
| < 50 | Do not insert / delete on recalc |

---

## 3. Gemini reason generation

Only for `match_score >= 75`. Never regenerate if `personalised_reason` already set.

System prompt (from spec):

> You write short, warm, human personalised event recommendations in one or two sentences maximum. Never use em dashes. Never sound like an AI. Sound like a friend who knows the person well.

User prompt includes event name, artist, genre, date, city, and bullet list from `match_reasons`.

Store in `personalised_reason`.

---

## 4. Scoring formula reference

| Signal | Max points |
|--------|------------|
| Genre match | 25 (15 if related via tip history) |
| Mood overlap | 15 (8 partial) |
| Location | 20 / 15 / 10 by city/proximity |
| Availability | 20 calendar free OR 10 time + 10 month |
| Artist affinity | 15 tip / 15 live interest / 8 follow |
| Planning window | 5 |

Calendar connected: availability uses free/busy (+20) instead of time/month split.

---

## 5. Mobile files

| File | Role |
|------|------|
| `src/services/EventMatchIntelligenceService.ts` | Supabase fetch + mark viewed |
| `src/contexts/EventMatchIntelligenceContext.tsx` | Shared state for feed + header |
| `src/components/EventMatchPulseIndicator.tsx` | Header pulse dot |
| `src/components/EventForYouBadge.tsx` | Card overlay badge |
| `src/screens/EventsPickedForYouScreen.tsx` | Picked events list |
| `src/components/EventPostCard.tsx` | Feed card integration |
| `src/screens/TestFeedScreen.tsx` | Passes match data to cards |

---

## 6. Testing checklist

### Web
- [ ] Migration applied; RLS policies work
- [ ] Daily cron runs at 3AM UK
- [ ] Scores match formula for test users
- [ ] Gemini called only once per high-confidence pair
- [ ] Expired rows cleaned up

### Mobile (after web populates scores)
- [ ] Pulse appears on Feed header for unseen ≥75 match
- [ ] Tap opens "Events picked for you" in score order
- [ ] Reasons display under cards
- [ ] Pulse hides after viewing screen
- [ ] "For you" badge on matched event posts in feed
- [ ] New matches next day re-show pulse

---

## 7. No new mobile API routes

All data via Supabase `event_match_scores` + `events` join, same pattern as calendar nudge profile columns.
