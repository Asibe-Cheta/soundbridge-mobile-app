# Google Calendar Nudge + Notification Timing — Web Handoff

**Status: WEB BACKEND READY (Jun 2026)** — Migrations + event dispatch timing logic deployed. No new API routes. Defaults (`any_time` / empty months) preserve prior behaviour.

**Before smoke test (Justice):** Apply migrations on Supabase + deploy edge function, then verify mobile OTA.

Mobile OTA adds two features from `GOOGLE_CALENDAR_NUDGE.MD`. Web uses the new preference fields when dispatching event notifications (deferred via `scheduled_notifications` when outside preferred window).

## 1. Database migration

Run `migrations/google_calendar_nudge_and_notification_timing.sql`:

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS calendar_nudge_shown_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calendar_nudge_last_shown_at timestamptz;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS preferred_notification_times text[] DEFAULT ARRAY['any_time']::text[],
  ADD COLUMN IF NOT EXISTS event_planning_window text DEFAULT 'any_time',
  ADD COLUMN IF NOT EXISTS active_event_months integer[] DEFAULT ARRAY[]::integer[];
```

Mobile reads/writes these via Supabase client. No new API routes required.

---

## 2. Calendar nudge (profiles)

| Column | Type | Mobile behaviour |
|--------|------|----------------|
| `calendar_nudge_shown_count` | integer | Incremented each time the feed banner is displayed (max 2). |
| `calendar_nudge_last_shown_at` | timestamptz | Set when banner is shown. |

App open count for nudge eligibility is stored locally on device (`AsyncStorage`), not in DB. Web does not need to read it.

---

## 3. Notification timing preferences

Stored on `notification_preferences` row per user. Mobile saves via existing upsert on `notification_preferences`.

### `preferred_notification_times` (text[])

Allowed values: `morning`, `afternoon`, `evening`, `any_time`

| Value | Meaning |
|-------|---------|
| `morning` | Before 12:00 local |
| `afternoon` | 12:00 – 17:00 local |
| `evening` | 17:00 – 21:00 local |
| `any_time` | No time-of-day filter (default) |

**Dispatch rule:** Queue event notifications for the user's next preferred window instead of sending immediately at event creation. Respect existing `start_hour` / `end_hour` / `timezone` as hard bounds.

### `event_planning_window` (text)

Allowed values: `last_minute`, `few_weeks`, `one_to_three_months`, `any_time`

| Value | Suggested lead time |
|-------|---------------------|
| `last_minute` | Notify only within 7 days of event |
| `few_weeks` | Notify 1–4 weeks before event |
| `one_to_three_months` | Notify 1–3 months before event |
| `any_time` | No lead-time filter (default) |

**Dispatch rule:** When an event is created or becomes relevant, only notify if the event date falls within the user's planning window.

### `active_event_months` (integer[])

Months `1`–`12` (January = 1). Empty array = year-round (default).

**Dispatch rule:** If non-empty, only send event notifications when the event month is in this list.

---

## 4. Web cron / notification pipeline changes

Update event notification dispatch (cron, webhook, or `send_event_notifications` RPC) to:

1. Join `notification_preferences` for the recipient.
2. Skip event notifications when `event_notifications_enabled = false`.
3. Apply **active months** filter when `active_event_months` is non-empty.
4. Apply **planning window** filter based on days until event vs `event_planning_window`.
5. Schedule delivery in **preferred notification times** rather than immediate send (unless `any_time` is the only selected value).

Existing fields unchanged: `preferred_event_genres`, `location_state`, `location_country`, `start_hour`, `end_hour`, `timezone`.

---

## 5. Testing checklist (web)

- [ ] Migration applied on production Supabase
- [ ] Mobile can save `preferred_notification_times`, `event_planning_window`, `active_event_months`
- [ ] Mobile can update `calendar_nudge_shown_count` on profiles
- [ ] Event cron respects planning window
- [ ] Event cron respects active months
- [ ] Event cron defers to preferred time-of-day windows

---

## 6. Mobile files (reference)

| File | Purpose |
|------|---------|
| `src/services/CalendarNudgeService.ts` | App open count + nudge eligibility |
| `src/components/GoogleCalendarNudgeBanner.tsx` | Feed banner UI |
| `src/screens/TestFeedScreen.tsx` | Banner + OAuth entry |
| `src/screens/NotificationPreferencesScreen.tsx` | Three new timing sections |
| `src/services/NotificationService.ts` | Preference field mapping |
